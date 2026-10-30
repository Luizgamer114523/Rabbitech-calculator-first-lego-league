'use strict';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let payload={title:'Rabbitech',body:'Você tem uma nova atualização.',url:'/'};
 try{if(event.data)payload={...payload,...event.data.json()}}catch(_){}
 event.waitUntil(self.registration.showNotification(String(payload.title||'Rabbitech'),{
  body:String(payload.body||'Você tem uma nova atualização.'),
  tag:String(payload.tag||'rabbitech-push'),
  data:{url:String(payload.url||'/')}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=event.notification.data?.url||'/';
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
  const existing=windows.find(client=>'focus' in client);
  if(existing){existing.navigate(target);return existing.focus()}
  return self.clients.openWindow(target);
 }));
});
