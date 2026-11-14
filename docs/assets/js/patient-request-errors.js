/* Mensajes HTTP consistentes para guardado, subida y descarga en expedientes clínicos. */
(function(root){
 'use strict';
 const fallback={
  400:'La información enviada no es válida. Revisa los campos.',
  401:'Tu sesión necesita autenticación. Inicia sesión e inténtalo de nuevo.',
  403:'No tienes permiso para realizar esta operación.',
  404:'El archivo o registro ya no está disponible.',
  408:'La solicitud tardó demasiado. Comprueba el estado antes de repetirla.',
  409:'El registro ha cambiado o existe un conflicto. Actualiza antes de guardar.',
  413:'El archivo o contenido excede el tamaño permitido.',
  429:'Hay demasiadas solicitudes. Espera antes de volver a intentarlo.',
  500:'El servidor no pudo completar la operación.',
  502:'El servidor no está respondiendo correctamente.',
  503:'La API o MySQL no están disponibles. Revisa el servicio antes de reintentar.',
  504:'Se agotó el tiempo de respuesta del servidor.'
 };
 function errorFrom(response,data={},otherwise='No fue posible completar la operación.'){
  const status=Number(response?.status)||0;
  const requestId=String(data?.requestId||response?.headers?.get('X-Request-ID')||'').trim().slice(0,40);
  const message=String(data?.mensaje||fallback[status]||otherwise);
  const err=new Error(message+(requestId?' · Ref. '+requestId:''));
  err.status=status;err.requestId=requestId;err.code=data?.codigo||null;
  return err;
 }
 async function parseJson(response){
  try{return await response.json()}catch{return {}}
 }
 function networkError(){
  const error=new Error('No se pudo conectar con el servidor. No vuelvas a guardar sin comprobar antes si el registro se creó.');
  error.code='NETWORK_UNCERTAIN';
  return error;
 }
 async function expectBlob(response,mimes){
  if(!response.ok)throw errorFrom(response,await parseJson(response),'No fue posible descargar el documento.');
  const mime=(response.headers.get('Content-Type')||'').split(';')[0].toLowerCase();
  if(Array.isArray(mimes)&&mimes.length&&!mimes.some(item=>mime===item||item.endsWith('/*')&&mime.startsWith(item.slice(0,-1)))){
   throw errorFrom({status:502,headers:response.headers},{mensaje:'El servidor respondió con un formato inesperado en lugar del archivo.'});
  }
  const blob=await response.blob();
  if(!blob.size)throw errorFrom({status:502,headers:response.headers},{mensaje:'El archivo recibido está vacío. No se descargó.'});
  return blob;
 }
 root.SamanthaRequestErrors={errorFrom,parseJson,networkError,expectBlob};
})(typeof window!=='undefined'?window:globalThis);
