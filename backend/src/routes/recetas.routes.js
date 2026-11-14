'use strict';
/* Prescripciones privadas vinculadas a pacientes. Basado en el flujo de texto libre
   y PDF persistente de HospitalOS, adaptado al esquema real de Samantha. */
const express = require('express');
const PDFDocument = require('pdfkit');
const crypto = require('node:crypto');
const pool = require('../config/database');
const router = express.Router();
const MAX_CHARS=12000;
const validId = id => /^[1-9]\d{0,14}$/.test(String(id));
const clean = value => String(value ?? '').trim();
function validateText(value){
 if(typeof value!=='string')return null;
 const s=value.replace(/\r\n?/g,'\n').trim();
 return s.length>0 && s.length<=MAX_CHARS && s.split('\n').length<=300 && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(s)?s:null;
}
function mexicoDate(d){return new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)}
function pdfOf({folio,paciente,texto,profesional,cedula,fecha}){
 return new Promise((resolve,reject)=>{
  const doc=new PDFDocument({size:[396,612],margins:{top:38,bottom:44,left:34,right:34},bufferPages:true,info:{Title:'Prescripción clínica '+folio,Author:"Samantha's Studio Lab"}});
  const chunks=[];doc.on('data',v=>chunks.push(v));doc.once('end',()=>resolve(Buffer.concat(chunks)));doc.once('error',reject);
  const width=328;
  function heading(){
   doc.font('Helvetica-Bold').fontSize(16).fillColor('#695080').text("Samantha's Studio Lab",{width,align:'center'});
   doc.moveDown(.25).font('Helvetica').fontSize(9).fillColor('#7e6c89').text('CONSULTORIO DENTAL · INDICACIONES CLÍNICAS',{width,align:'center'});
   doc.moveDown(.7).strokeColor('#dacde5').lineWidth(1).moveTo(34,doc.y).lineTo(362,doc.y).stroke();doc.moveDown(.8);
  }
  heading();
  doc.fillColor('#3d3346').fontSize(9).font('Helvetica-Bold').text('Paciente: ',{continued:true}).font('Helvetica').text(paciente,{width});
  doc.moveDown(.25).font('Helvetica-Bold').text('Fecha: ',{continued:true}).font('Helvetica').text(mexicoDate(fecha));
  doc.moveDown(.25).font('Helvetica-Bold').text('Folio: ',{continued:true}).font('Helvetica').text(folio);
  doc.moveDown(1).font('Helvetica-Bold').fontSize(11).fillColor('#695080').text('Prescripción e indicaciones');
  doc.moveDown(.5).font('Helvetica').fontSize(10).fillColor('#342b40').text(texto,{width,lineGap:3,align:'left'});
  doc.moveDown(1.2).font('Helvetica-Bold').fontSize(9).fillColor('#68517d').text(profesional||'Profesional pendiente de identificar');
  if(cedula)doc.moveDown(.25).font('Helvetica').text('Cédula profesional: '+cedula);
  const pageRange=doc.bufferedPageRange();
  for(let i=0;i<pageRange.count;i++){
    doc.switchToPage(pageRange.start+i);
    const max=doc.page.height;
    doc.font('Helvetica').fontSize(7).fillColor('#96859d').text('Documento del expediente clínico · Validar firma y cédula del profesional antes de su uso.',34,max-31,{width:328,align:'center',lineBreak:false});
  }
  doc.end();
 });
}
router.get('/pacientes/:id',async(req,res,next)=>{
 try{
  if(!validId(req.params.id))return res.status(400).json({ok:false,mensaje:'Paciente inválido.'});
  const [items]=await pool.query('SELECT id_receta AS idReceta, folio, titulo, profesional, cedula, created_at AS creadoAt FROM recetas_clinicas WHERE id_paciente = ? ORDER BY id_receta DESC LIMIT 150',[req.params.id]);
  res.set('Cache-Control','no-store').json({ok:true,items});
 }catch(e){next(e)}
});
router.post('/pacientes/:id',async(req,res,next)=>{
 try{
  if(!validId(req.params.id))return res.status(400).json({ok:false,mensaje:'Paciente inválido.'});
  const texto=validateText(req.body?.texto);
  const profesional=clean(req.body?.profesional),cedula=clean(req.body?.cedula);
  if(!texto||profesional.length>160||cedula.length>60)return res.status(400).json({ok:false,mensaje:'Revisa el contenido de la receta (máximo 12,000 caracteres) y los datos profesionales.'});
  const [rows]=await pool.query('SELECT CONCAT_WS(" ", nombres, apellido_paterno, apellido_materno) AS nombre FROM pacientes WHERE id_paciente=? LIMIT 1',[req.params.id]);
  if(!rows.length)return res.status(404).json({ok:false,mensaje:'Paciente no encontrado.'});
  const fecha=new Date();
  const stamp=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(fecha).replace(/-/g,'');
  const folio='SSL-RX-'+stamp+'-'+crypto.randomBytes(5).toString('hex').toUpperCase();
  const titulo=texto.split('\n').find(line=>line.trim())?.trim().slice(0,120)||'Prescripción clínica';
  const pdf=await pdfOf({folio,paciente:rows[0].nombre,texto,profesional,cedula,fecha});
  const [result]=await pool.query('INSERT INTO recetas_clinicas (id_paciente,folio,titulo,texto,profesional,cedula,pdf_documento) VALUES (?,?,?,?,?,?,?)',
    [req.params.id,folio,titulo,texto,profesional||null,cedula||null,pdf]);
  res.status(201).set('Cache-Control','no-store').json({ok:true,idReceta:result.insertId,folio});
 }catch(e){next(e)}
});
router.get('/:id/pdf',async(req,res,next)=>{
 try{
  if(!validId(req.params.id))return res.status(400).json({ok:false,mensaje:'Receta inválida.'});
  const [rows]=await pool.query('SELECT folio,pdf_documento FROM recetas_clinicas WHERE id_receta=? LIMIT 1',[req.params.id]);
  if(!rows.length)return res.status(404).json({ok:false,mensaje:'Receta no encontrada.'});
  res.set({'Content-Type':'application/pdf','Content-Disposition':'inline; filename="'+rows[0].folio+'.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  res.end(rows[0].pdf_documento);
 }catch(e){next(e)}
});
router.delete('/:id',async(req,res,next)=>{
 try{
  if(!validId(req.params.id))return res.status(400).json({ok:false,mensaje:'Receta inválida.'});
  const [result]=await pool.query('DELETE FROM recetas_clinicas WHERE id_receta=?',[req.params.id]);
  if(!result.affectedRows)return res.status(404).json({ok:false,mensaje:'Receta no encontrada.'});
  res.json({ok:true});
 }catch(e){next(e)}
});
module.exports=router;
