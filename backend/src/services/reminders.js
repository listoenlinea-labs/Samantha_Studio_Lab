'use strict';
/* Envío transaccional de recordatorios: ningún paciente se contacta sin consentimiento.
   Días antes: hora configurada de CDMX. Horas antes: hora exacta de la cita.
   Las citas y fechas están en hora local Mexico City (sin horario de verano desde 2023).
   Al reprogramar una cita, la clave id_cita+fecha permite nuevos avisos. */
const nodemailer=require('nodemailer');
const pool=require('../config/database');
const TIME_ZONE='America/Mexico_City';
const WINDOW_MS=15*60*1000;
const flag=v=>v===true||v===1||v==='1'||v==='true';
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||''));
const number=v=>{const digits=String(v||'').replace(/\D/g,'');return digits.length===10?'52'+digits:digits.startsWith('521')&&digits.length===13?'52'+digits.slice(3):digits.startsWith('52')&&digits.length===12?digits:null};
function parts(date){
 const values=new Intl.DateTimeFormat('en-GB',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
 .formatToParts(date).filter(x=>x.type!=='literal');
 return Object.fromEntries(values.map(x=>[x.type,x.value]));
}
function sqlLocal(date){const p=parts(date);return p.year+'-'+p.month+'-'+p.day+' '+p.hour+':'+p.minute}
function mxDateAndHour(cita){
 const p=String(cita.inicioLocal||'').split(' ');
 const date=p[0]||'',hour=(p[1]||'').slice(0,5);
 return {date,hour,dateDisplay:date.split('-').reverse().join('/')};
}
function dateMillis(sql){
 if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(sql)))return NaN;
 return Date.parse(sql.replace(' ','T')+':00-06:00');
}
function asList(value){
 let arr;try{arr=typeof value==='string'?JSON.parse(value):value}catch{return []}
 return Array.isArray(arr)?[...new Set(arr.filter(x=>Number.isInteger(x)&&x>=1&&x<=3))].sort((a,b)=>a-b):[];
}
function dueSlots(cita,cfg,now=new Date()){
 const start=dateMillis(cita.inicioLocal),hour=Number(cfg.hora_envio);
 if(!Number.isFinite(start))return [];
 const nowMs=now.getTime(),out=[],h=Number.isInteger(hour)&&hour>=0&&hour<=23?hour:9;
 for(const d of asList(cfg.dias_antes)){
  const localDay=sqlLocal(new Date(start-d*86400000)).slice(0,10);
  const target=Date.parse(localDay+'T'+String(h).padStart(2,'0')+':00:00-06:00');
  if(nowMs>=target&&nowMs-target<WINDOW_MS)out.push('D'+d);
 }
 for(const hours of asList(cfg.horas_antes)){
  const target=start-hours*3600000;
  if(nowMs>=target&&nowMs-target<WINDOW_MS)out.push('H'+hours);
 }
 return out;
}
async function config(){
 const [rows]=await pool.query('SELECT * FROM recordatorios_config WHERE id=1');
 return rows[0]||null;
}
function providers(){
 return {
  enabled:process.env.REMINDERS_ENABLED==='true'&&process.env.NODE_ENV==='production',
  smtp:!!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD&&process.env.SMTP_FROM),
  whatsapp:!!(process.env.WHATSAPP_PHONE_NUMBER_ID&&process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_TEMPLATE_NAME&&process.env.WHATSAPP_TEMPLATE_NAME!=='hello_world')
 };
}
function emailBody(cita,cfg){
 const time=mxDateAndHour(cita),clinic=cfg.nombre_consultorio||"Samantha's Studio Lab";
 const message='Hola '+cita.nombrePaciente+',\n\nTe recordamos tu cita dental el '+time.dateDisplay+' a las '+time.hour+'.\n'+
   (cita.doctor?'Profesional: '+cita.doctor+'\n':'')+
   (cfg.direccion_consultorio?'Dirección: '+cfg.direccion_consultorio+'\n':'')+
   '\nSi necesitas cambiar tu cita, comunícate directamente con el consultorio.\n\n'+clinic;
 return message;
}
async function sendEmail(cita,cfg){
 const t=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});
 try{await t.sendMail({from:process.env.SMTP_FROM,to:cita.correo,subject:'Recordatorio de cita · '+(cfg.nombre_consultorio||'Samantha Studio Lab'),text:emailBody(cita,cfg)})}
 finally{t.close()}
}
async function sendWhatsApp(cita,cfg){
 const p=number(cita.telefono),{dateDisplay,hour}=mxDateAndHour(cita);
 if(!p)throw Error('PHONE_INVALID');
 const template=process.env.WHATSAPP_TEMPLATE_NAME;
 const payload={messaging_product:'whatsapp',to:p,type:'template',template:{
  name:template,language:{code:process.env.WHATSAPP_TEMPLATE_LANGUAGE||'es_MX'},components:[{type:'body',parameters:[
   cita.nombrePaciente,dateDisplay,hour,cita.doctor||cfg.nombre_consultorio||'Consultorio',cfg.direccion_consultorio||'Consultorio'
  ].map(text=>({type:'text',text:String(text)}))}]}};
 const response=await fetch('https://graph.facebook.com/'+(process.env.WHATSAPP_API_VERSION||'v23.0')+'/'+encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID)+'/messages',{
  method:'POST',headers:{Authorization:'Bearer '+process.env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'},
  body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error('META_HTTP_'+response.status);
}
let running=false;
async function runOnce(now=new Date()){
 if(running)return {skipped:'busy'};
 const provider=providers();
 if(!provider.enabled)return {skipped:'disabled'};
 running=true;
 let sent=0,failed=0;
 try{
  const cfg=await config();
  if(!cfg)return {skipped:'not_configured'};
  const from=sqlLocal(new Date(now.getTime()-900000)),until=sqlLocal(new Date(now.getTime()+4*86400000));
  const [citas]=await pool.query(
   "SELECT c.id_cita AS idCita, DATE_FORMAT(c.inicio_at,'%Y-%m-%d %H:%i') AS inicioLocal,"+
   " c.doctor, CONCAT_WS(' ',p.nombres,p.apellido_paterno,p.apellido_materno) AS nombrePaciente,"+
   " p.correo,p.telefono,p.recordatorio_correo_consentido AS consentimientoEmail,"+
   " p.recordatorio_whatsapp_consentido AS consentimientoWhatsapp"+
   " FROM citas c INNER JOIN pacientes p ON c.id_paciente=p.id_paciente"+
   " WHERE c.inicio_at BETWEEN ? AND ? AND c.estado IN ('PROGRAMADA','POR_CONFIRMAR','CONFIRMADA')"+
   " AND p.activo=1 ORDER BY c.inicio_at LIMIT 300",[from,until]);
  for(const cita of citas){
   for(const window of dueSlots(cita,cfg,now)){
    const channels=[
     {key:'EMAIL',available:flag(cfg.email_habilitado)&&provider.smtp&&flag(cita.consentimientoEmail)&&emailOk(cita.correo),send:sendEmail},
     {key:'WHATSAPP',available:flag(cfg.whatsapp_habilitado)&&provider.whatsapp&&flag(cita.consentimientoWhatsapp)&&!!number(cita.telefono),send:sendWhatsApp}
    ];
    for(const channel of channels){
     if(!channel.available)continue;
     const [insertion]=await pool.query(
      "INSERT IGNORE INTO recordatorios_envios (id_cita,canal,ventana,cita_inicio,estado) VALUES (?,?,?,?,'ENVIANDO')",
      [cita.idCita,channel.key,window,cita.inicioLocal]);
     if(!insertion.affectedRows)continue; // una única tentativa por cita/fecha/canal/ventana
     try{await channel.send(cita,cfg);sent++;
      await pool.query("UPDATE recordatorios_envios SET estado='ENVIADO',detalle_error=NULL WHERE id_envio=?",[insertion.insertId]);
     }catch(e){failed++;
      const safe=e.message.startsWith('META_HTTP_')?e.message:channel.key==='EMAIL'?'SMTP_FAILED':'WHATSAPP_FAILED';
      await pool.query("UPDATE recordatorios_envios SET estado='FALLIDO',detalle_error=? WHERE id_envio=?",[safe,insertion.insertId]);
      console.warn('[recordatorios] Envío fallido:',safe);
     }
    }
   }
  }
  return {sent,failed};
 }finally{running=false}
}
function start(){
 if(!providers().enabled){console.log('[recordatorios] Deshabilitados hasta configurar REMINDERS_ENABLED=true en producción.');return}
 const tick=()=>runOnce().catch(e=>console.error('[recordatorios] Error de consulta:',e.code||e.message));
 tick();const t=setInterval(tick,5*60000);t.unref?.();
}
module.exports={runOnce,start,config,providers,dueSlots,asList,number};
