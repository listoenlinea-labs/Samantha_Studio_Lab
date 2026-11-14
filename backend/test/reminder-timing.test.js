const test=require('node:test');
const assert=require('node:assert/strict');
const {dueSlots,asList,number,providers}=require('../src/services/reminders');

test('recupera configuración por ventanas y elimina duplicados',()=>{
 assert.deepEqual(asList('[1,3,1]'),[1,3]);
 assert.deepEqual(asList('[0,4]'),[]);
});
test('normaliza teléfonos mexicanos antes de Meta',()=>{
 assert.equal(number('33 1234 5678'),'523312345678');
 assert.equal(number('5213312345678'),'523312345678');
 assert.equal(number('hola'),null);
});
test('incluye recordatorio por horas cuando corresponde en Guadalajara',()=>{
 const cita={inicioLocal:'2026-11-20 15:30'};
 const cfg={dias_antes:'[1,3]',horas_antes:'[1,3]',hora_envio:9};
 assert.deepEqual(dueSlots(cita,cfg,new Date('2026-11-20T20:30:00Z')),['H1']);
 assert.deepEqual(dueSlots(cita,cfg,new Date('2026-11-19T15:00:00Z')),['D1']);
 assert.deepEqual(dueSlots(cita,cfg,new Date('2026-11-20T23:00:00Z')),[]);
});
test('los proveedores permanecen inactivos sin habilitación explícita',()=>{
 const original=process.env.REMINDERS_ENABLED;process.env.REMINDERS_ENABLED='false';
 try{assert.equal(providers().enabled,false)}finally{if(original===undefined)delete process.env.REMINDERS_ENABLED;else process.env.REMINDERS_ENABLED=original}
});
