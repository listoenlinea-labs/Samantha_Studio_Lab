'use strict';
const express=require('express');
const pool=require('../config/database');
const reminders=require('../services/reminders');
const router=express.Router();
const text=(x,max)=>String(x==null?'':x).trim().slice(0,max+1);
const flags=v=>v===true||v==='true'||v===1||v==='1';
function validateList(list){return Array.isArray(list)&&list.length>0&&list.length<=3&&list.every(x=>Number.isInteger(x)&&x>=1&&x<=3)}
router.get('/configuracion',async(req,res,next)=>{
 try{
  const cfg=await reminders.config();
  if(!cfg)return res.status(503).json({ok:false,mensaje:'No está preparada la configuración de recordatorios.'});
  res.set('Cache-Control','no-store').json({ok:true,data:{
   nombreConsultorio:cfg.nombre_consultorio,direccionConsultorio:cfg.direccion_consultorio||'',
   diasAntes:reminders.asList(cfg.dias_antes),horasAntes:reminders.asList(cfg.horas_antes),
   horaEnvio:cfg.hora_envio,correoHabilitado:!!cfg.email_habilitado,whatsappHabilitado:!!cfg.whatsapp_habilitado,
   proveedores:reminders.providers()}});
 }catch(e){next(e)}
});
router.patch('/configuracion',async(req,res,next)=>{
 try{
  const r=req.body||{},name=text(r.nombreConsultorio,120),address=text(r.direccionConsultorio,300);
  const hour=Number(r.horaEnvio),days=r.diasAntes,hours=r.horasAntes;
  if(!name||name.length>120||address.length>300||!validateList(days)||!validateList(hours)||!Number.isInteger(hour)||hour<0||hour>23)
   return res.status(400).json({ok:false,mensaje:'Revisa horarios, días, horas y datos del consultorio.'});
  await pool.query(
   'UPDATE recordatorios_config SET nombre_consultorio=?,direccion_consultorio=?,dias_antes=?,horas_antes=?,hora_envio=?,email_habilitado=?,whatsapp_habilitado=? WHERE id=1',
   [name,address||null,JSON.stringify(days),JSON.stringify(hours),hour,flags(r.correoHabilitado)?1:0,flags(r.whatsappHabilitado)?1:0]);
  res.json({ok:true,mensaje:'Preferencias guardadas. Los envíos siguen sujetos a los proveedores, consentimiento y REMINDERS_ENABLED.'});
 }catch(e){next(e)}
});
router.get('/envios',async(req,res,next)=>{
 try{
  const [items]=await pool.query("SELECT e.id_envio AS idEnvio,e.canal,e.ventana,e.estado,e.detalle_error AS detalleError,e.created_at AS creadoAt,"+
   "DATE_FORMAT(e.cita_inicio,'%Y-%m-%d %H:%i') AS fechaCita,"+
   "CONCAT_WS(' ',p.nombres,p.apellido_paterno,p.apellido_materno) AS paciente"+
   " FROM recordatorios_envios e INNER JOIN citas c ON c.id_cita=e.id_cita INNER JOIN pacientes p ON p.id_paciente=c.id_paciente"+
   " ORDER BY e.id_envio DESC LIMIT 100");
  res.set('Cache-Control','no-store').json({ok:true,items});
 }catch(e){next(e)}
});
module.exports=router;
