const test=require('node:test');
const assert=require('node:assert/strict');
const {validateFile,sniff,publicName}=require('../src/services/clinical-file-validation');
test('solo PDF auténtico en Archivos PDF',()=>{
 const pdf=Buffer.from('%PDF-1.7\n1 0 obj\n%%EOF','ascii');
 assert.equal(validateFile({buffer:pdf,filename:'consentimiento.pdf',category:'PDF'}).mime,'application/pdf');
 assert.throws(()=>validateFile({buffer:pdf,filename:'consentimiento.jpg',category:'PDF'}));
 assert.throws(()=>validateFile({buffer:Buffer.from('<svg>'),filename:'imagen.pdf',category:'PDF'}));
});
test('valida firmas y extensiones DICOM Part 10',()=>{
 const dicom=Buffer.alloc(256);dicom.write('DICM',128,'ascii');
 assert.equal(sniff(dicom),'application/dicom');
 assert.equal(validateFile({buffer:dicom,filename:'estudio.dcm',category:'RADIOGRAFIA'}).mime,'application/dicom');
 assert.throws(()=>validateFile({buffer:dicom,filename:'estudio.exe',category:'RADIOGRAFIA'}));
});
test('detecta ZIP, PNG y restricciones de categoría',()=>{
 const zip=Buffer.from([0x50,0x4b,0x03,0x04,0,0]);
 assert.equal(validateFile({buffer:zip,filename:'cbct.zip',category:'RADIOGRAFIA'}).mime,'application/zip');
 assert.throws(()=>validateFile({buffer:zip,filename:'cbct.zip',category:'PDF'}));
 assert.equal(sniff(Buffer.from([137,80,78,71,13,10,26,10,0,0])),'image/png');
});
test('impide tamaño excesivo y nombres de control',()=>{
 const pdf=Buffer.concat([Buffer.from('%PDF-'),Buffer.alloc(5*1024*1024)]);
 assert.throws(()=>validateFile({buffer:pdf,filename:'documento.pdf',category:'PDF'}),e=>e.status===413);
 assert.throws(()=>publicName('archivo\nmalicioso.pdf'));
});
