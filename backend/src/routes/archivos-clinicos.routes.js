'use strict';
const express=require('express');
const pool=require('../config/database');
const {validateFile,MAX_ADVANCED}=require('../services/clinical-file-validation');
const router=express.Router();
const idOk=value=>/^[1-9]\d{0,14}$/.test(String(value));
const clientError=(res,error)=>{
 if(error.status)return res.status(error.status).json({ok:false,mensaje:error.message});
 return null;
};
router.use((req,res,next)=>{
 res.set('Cache-Control','private, no-store');
 res.set('X-Content-Type-Options','nosniff');
 next();
});
router.get('/:id/archivos',async(req,res,next)=>{
 try{
  if(!idOk(req.params.id))return res.status(400).json({ok:false,mensaje:'Paciente inválido.'});
  const categoria=String(req.query.categoria||'').toUpperCase();
  if(categoria&&!['PDF','RADIOGRAFIA'].includes(categoria))return res.status(400).json({ok:false,mensaje:'Categoría inválida.'});
  const sql="SELECT id_archivo AS idArchivo, categoria, nombre_original AS nombre, descripcion, tipo_mime AS tipoMime, bytes, created_at AS creadoAt FROM archivos_clinicos_ssl WHERE id_paciente=?"+
   (categoria?" AND categoria=?":"")+" ORDER BY id_archivo DESC LIMIT 800";
  const [items]=await pool.query(sql,categoria?[req.params.id,categoria]:[req.params.id]);
  res.json({ok:true,items,canDelete:process.env.CLINICAL_FILE_DELETE_ENABLED==='true'});
 }catch(error){next(error)}
});
router.post('/:id/archivos',express.raw({type:()=>true,limit:MAX_ADVANCED}),async(req,res,next)=>{
 try{
  if(!idOk(req.params.id))return res.status(400).json({ok:false,mensaje:'Paciente inválido.'});
  if(!Buffer.isBuffer(req.body))return res.status(400).json({ok:false,mensaje:'Selecciona un archivo binario.'});
  const categoria=String(req.query.categoria||'').toUpperCase();
  const {nombre,mime,size}=validateFile({buffer:req.body,filename:req.query.nombre,category:categoria});
  const descripcion=String(req.query.descripcion||'').trim();
  if(descripcion.length>500)return res.status(400).json({ok:false,mensaje:'Descripción demasiado larga (máximo 500 caracteres).'});
  const [p]=await pool.query('SELECT id_paciente FROM pacientes WHERE id_paciente=? LIMIT 1',[req.params.id]);
  if(!p.length)return res.status(404).json({ok:false,mensaje:'Paciente no encontrado.'});
  const [result]=await pool.query(
   'INSERT INTO archivos_clinicos_ssl (id_paciente,categoria,nombre_original,descripcion,tipo_mime,bytes,contenido) VALUES (?,?,?,?,?,?,?)',
   [req.params.id,categoria,nombre,descripcion||null,mime,size,req.body]
  );
  res.status(201).json({ok:true,idArchivo:result.insertId,mensaje:'Archivo guardado en el expediente privado.'});
 }catch(error){if(clientError(res,error))return;next(error)}
});
router.get('/:id/archivos/:fileId',async(req,res,next)=>{
 try{
  if(!idOk(req.params.id)||!idOk(req.params.fileId))return res.status(400).json({ok:false,mensaje:'Identificador inválido.'});
  const [items]=await pool.query(
   'SELECT nombre_original,tipo_mime,contenido FROM archivos_clinicos_ssl WHERE id_archivo=? AND id_paciente=? LIMIT 1',
   [req.params.fileId,req.params.id]
  );
  if(!items.length)return res.status(404).json({ok:false,mensaje:'Archivo no encontrado en este expediente.'});
  const row=items[0],name=String(row.nombre_original||'archivo').replace(/[\r\n"\\]/g,'_');
  // No servir HTML, SVG ni JavaScript. DICOM/ZIP descargables o consultables como bytes.
  const inline=/^(application\/pdf|image\/jpeg|image\/png|image\/webp)$/.test(row.tipo_mime);
  res.set('Content-Type',row.tipo_mime);
  res.set('Content-Disposition',(inline?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(name));
  res.send(row.contenido);
 }catch(error){next(error)}
});
router.delete('/:id/archivos/:fileId',async(req,res,next)=>{
 try{
  if(!idOk(req.params.id)||!idOk(req.params.fileId))return res.status(400).json({ok:false,mensaje:'Identificador inválido.'});
  // Requiere autorización de administrador antes de habilitar borrados a otros roles.
  if(process.env.CLINICAL_FILE_DELETE_ENABLED!=='true')
   return res.status(403).json({ok:false,mensaje:'Borrado clínico desactivado. Configura autorización administrativa y CLINICAL_FILE_DELETE_ENABLED=true.'});
  const [result]=await pool.query(
   'DELETE FROM archivos_clinicos_ssl WHERE id_archivo=? AND id_paciente=?',[req.params.fileId,req.params.id]);
  if(!result.affectedRows)return res.status(404).json({ok:false,mensaje:'Archivo inexistente en este expediente.'});
  res.json({ok:true,mensaje:'Archivo eliminado del expediente.'});
 }catch(error){next(error)}
});
module.exports=router;
