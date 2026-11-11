const routes=window.OSLO_RUTER_ROUTES||[];
const modes=['bus','tram','metro','boat'];
const copy={
  en:{brandSub:'A new way to see the city',network:'ROUTE NETWORK',eyebrow:'The city, in motion',heading:'Oslo’s transit<br>network, mapped.',intro:'Explore every public Ruter route in this map area. Choose bus, tram, T-bane or boat / ferry.',where:'Where are you?',placePlaceholder:'Enter a place in Oslo',locate:'Use my location',placeHelp:'Choose a place or allow location access.',placeCredit:'Place search by <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a> · OpenStreetMap.',search:'Find a line or destination',section:'Ruter routes crossing Oslo',count:'ROUTES',noteTitle:'Vehicle markers are estimates',note:'Each marker illustrates progress along one scheduled route. It is not a live vehicle location and does not reflect actual service, delays or the number of vehicles running. <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">Data terms</a>.',modeGroup:'Choose transport types',all:'All collective transport',bus:'Bus',tram:'Tram',metro:'T-bane',boat:'Boat / ferry',you:'You',status:'ESTIMATED · NOT LIVE',marker:'illustrative position, not live',searchPlaces:'Searching places…',chooseResult:'Choose your place from the results.',noPlaces:'No matching places found in Oslo.',minChars:'Enter at least 3 characters to search.',searchError:'Place search is unavailable right now. Try browser location.',locationUnavailable:'Location is not available in this browser.',waitingLocation:'Waiting for your browser’s location permission…',locationDenied:'Location permission was not granted.',locationFailed:'Could not get your location.',browserLocation:'Your browser location',unnamed:'Unnamed place',title:'Oslo in Motion — transit map',clockLocale:'en-GB'},
  no:{brandSub:'En ny måte å se byen på',network:'RUTENETT',eyebrow:'Byen i bevegelse',heading:'Oslos kollektivnett<br>på kartet.',intro:'Utforsk Ruters linjer i Oslo-området. Velg buss, trikk, T-bane eller båt / ferge.',where:'Hvor er du?',placePlaceholder:'Skriv inn et sted i Oslo',locate:'Bruk min posisjon',placeHelp:'Søk etter et sted, eller del posisjonen din.',placeCredit:'Stedsøk med <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a> · OpenStreetMap.',search:'Finn en linje eller et reisemål',section:'Ruter-linjer i Oslo-området',count:'LINJER',noteTitle:'Markørene viser anslått bevegelse',note:'Hver markør illustrerer bevegelse langs én rutetrasé. Den viser ikke et faktisk kjøretøy, rutetid, forsinkelse eller hvor mange kjøretøy som er i drift. <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">Datavilkår</a>.',modeGroup:'Velg transporttyper',all:'All kollektivtransport',bus:'Buss',tram:'Trikk',metro:'T-bane',boat:'Båt / ferge',you:'Du',status:'ANSLÅTT · IKKE SANNTID',marker:'anslått posisjon, ikke sanntid',searchPlaces:'Søker etter steder …',chooseResult:'Velg stedet ditt fra trefflisten.',noPlaces:'Fant ingen steder i Oslo som passer.',minChars:'Skriv minst 3 tegn for å søke.',searchError:'Stedsøk er utilgjengelig akkurat nå. Prøv posisjon fra nettleseren.',locationUnavailable:'Posisjon er ikke tilgjengelig i denne nettleseren.',waitingLocation:'Venter på tillatelse til å bruke posisjonen din …',locationDenied:'Du ga ikke tilgang til posisjonen din.',locationFailed:'Kunne ikke hente posisjonen din.',browserLocation:'Posisjonen din fra nettleseren',unnamed:'Ukjent sted',title:'Oslo i bevegelse — kollektivkart',clockLocale:'nb-NO'}
};
let language=localStorage.getItem('oslo-in-motion-language')==='no'?'no':'en';
function text(key){return copy[language][key]||copy.en[key]||key}
function modeLabel(mode){return text(mode)}
const map=L.map('map',{zoomControl:false,scrollWheelZoom:true,preferCanvas:true}).setView([59.923,10.755],12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);

const routeLayers=[];
const routeLayersById=new Map();
const routeById=new Map(routes.map(route=>[route.id,route]));
const renderer=L.canvas({padding:.4});
const routeStyles=new Map();
const vehicleMarkers=[];
const modeSpeeds={bus:19,tram:16,metro:34,boat:13};
const modeGlyphs={bus:'B',tram:'T',metro:'M',boat:'⌁'};
const modeColors={bus:'#087343',tram:'#a84600',metro:'#1749a5',boat:'#00677e'};
const estimatedMotionStarted=Date.now();
function routeHash(text){let value=0;for(const character of text)value=(value*31+character.charCodeAt(0))>>>0;return value}
function pathLength(points){let total=0;for(let i=1;i<points.length;i++)total+=map.distance(points[i-1],points[i]);return total}
function pointAlong(points,distance){for(let i=1;i<points.length;i++){const segment=map.distance(points[i-1],points[i]);if(distance<=segment){const ratio=segment?distance/segment:0;return [points[i-1][0]+(points[i][0]-points[i-1][0])*ratio,points[i-1][1]+(points[i][1]-points[i-1][1])*ratio]};distance-=segment}return points[points.length-1]}
function makeVehicleIcon(route){return L.divIcon({className:'estimated-vehicle-pin',html:`<span class="estimated-vehicle mode-${route.mode}" style="--vehicle-color:${modeColors[route.mode]}">${modeGlyphs[route.mode]}</span>`,iconSize:[22,22],iconAnchor:[11,11]})}
for(const route of routes){
  const layers=[];
  const width=route.mode==='bus'?2.6:3.4;
  for(const points of route.paths||[route.points]){
    const casing=L.polyline(points,{renderer,color:'#fffdf8',weight:width+2.5,opacity:.9,lineCap:'round',lineJoin:'round'}).addTo(map);
    const line=L.polyline(points,{renderer,color:route.color,weight:width,opacity:.92,lineCap:'round',lineJoin:'round'}).addTo(map);
    casing.routeId=line.routeId=route.id;
    line.bindPopup(`<strong>${modeLabel(route.mode)} ${escapeHTML(route.line)}</strong><br>${escapeHTML(route.description||route.name||'Ruter route')}`);
    layers.push(casing,line);
    routeLayers.push({layer:casing,mode:route.mode},{layer:line,mode:route.mode});
  }
  routeLayersById.set(route.id,layers);
  routeStyles.set(route.id,{width,opacity:.92});
  const paths=(route.paths||[route.points]).filter(points=>points&&points.length>1);
  if(paths.length){
    const path=paths[routeHash(route.id)%paths.length];
    const length=pathLength(path);
    if(length>0){
      const marker=L.marker(path[0],{icon:makeVehicleIcon(route),keyboard:false,zIndexOffset:500}).addTo(map);
      marker.bindTooltip(`${modeLabel(route.mode)} ${route.line} · ${text('marker')}`,{direction:'top',offset:[0,-10]});
      vehicleMarkers.push({marker,path,length,route,phase:(routeHash(route.id)%1000)/1000});
    }
  }
}

const stops=[['Jernbanetorget',59.9128,10.7500],['Nationaltheatret',59.9153,10.7352],['Majorstuen',59.9295,10.7148],['Stortinget',59.9133,10.7460],['Tøyen',59.9146,10.7771],['Grønland',59.9134,10.7613],['Nydalen',59.9554,10.7677],['Blindern',59.9405,10.7167],['Borgen',59.9348,10.6907],['Carl Berners plass',59.9259,10.7773],['Bjørvika',59.9076,10.7572],['Aker brygge',59.9112,10.7275],['Ullevål stadion',59.9491,10.7336],['Ensjø',59.9125,10.7833],['Storo',59.9470,10.7777],['Helsfyr',59.9110,10.8000]];
const stopLayer=L.layerGroup().addTo(map);
stops.forEach(stop=>L.marker([stop[1],stop[2]],{icon:L.divIcon({className:'stop-pin',html:'<div class="stop-dot"></div>',iconSize:[9,9],iconAnchor:[4.5,4.5]}),keyboard:false}).bindTooltip(stop[0],{direction:'top',offset:[0,-3],opacity:.88}).addTo(stopLayer));

let selectedModes=new Set(modes);
let query='';
let selectedRouteId=null;
const list=document.getElementById('vehicle-list');
const routeCount=document.getElementById('count');
const modeChecks=[...document.querySelectorAll('[data-mode-checkbox]')];

function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function syncModeChecks(){
  for(const checkbox of modeChecks){
    if(checkbox.dataset.modeCheckbox==='all')checkbox.checked=selectedModes.size===modes.length;
    else checkbox.checked=selectedModes.has(checkbox.dataset.modeCheckbox);
  }
}
function applyVisibility(){
  for(const item of routeLayers){
    if(selectedModes.has(item.mode))item.layer.addTo(map);
    else map.removeLayer(item.layer);
  }
  for(const vehicle of vehicleMarkers){
    if(selectedModes.has(vehicle.route.mode))vehicle.marker.addTo(map);
    else map.removeLayer(vehicle.marker);
  }
}
function selectRoute(routeId){
  selectedRouteId=routeId;
  const route=routeById.get(routeId);
  const paths=route?.paths||[route?.points||[]];
  const coordinates=paths.flat();
  if(coordinates.length)map.fitBounds(L.latLngBounds(coordinates),{padding:[35,35],maxZoom:15,duration:.65});
  for(const [id,layers] of routeLayersById){
    const style=routeStyles.get(id);
    layers.forEach((layer,index)=>layer.setStyle({weight:style.width+(id===routeId?2:0)+(index%2===0?2:0),opacity:id===routeId?1:style.opacity}));
  }
  renderList();
}
function renderList(){
  const visible=routes.filter(route=>selectedModes.has(route.mode)&&(`${route.line} ${route.name} ${route.description} ${modeLabel(route.mode)} ${copy.en[route.mode]} ${copy.no[route.mode]}`.toLowerCase().includes(query)));
  routeCount.textContent=`${visible.length} ${text('count')}`;
  list.innerHTML=visible.map(route=>`<button class="route-item mode-${route.mode}${selectedRouteId===route.id?' selected':''}" data-route-id="${escapeHTML(route.id)}"><span class="line-badge">${escapeHTML(route.line)}</span><span class="route-text"><span class="route-title">${modeLabel(route.mode)} ${escapeHTML(route.line)}</span><span class="route-description">${escapeHTML(route.description||route.name||'Ruter route')}</span></span><span class="route-chevron">↗</span></button>`).join('');
  list.querySelectorAll('.route-item').forEach(button=>button.addEventListener('click',()=>selectRoute(button.dataset.routeId)));
}

for(const checkbox of modeChecks){
  checkbox.addEventListener('change',()=>{
    const mode=checkbox.dataset.modeCheckbox;
    if(mode==='all')selectedModes=checkbox.checked?new Set(modes):new Set();
    else if(checkbox.checked)selectedModes.add(mode);
    else selectedModes.delete(mode);
    syncModeChecks();applyVisibility();renderList();
  });
}
document.getElementById('search').addEventListener('input',event=>{query=event.target.value.toLowerCase().trim();renderList()});
syncModeChecks();applyVisibility();renderList();

function applyLanguage(nextLanguage){
  language=nextLanguage==='no'?'no':'en';
  localStorage.setItem('oslo-in-motion-language',language);
  document.documentElement.lang=language;
  document.title=text('title');
  const set=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value};
  set('brand-sub',text('brandSub'));set('network-label',text('network'));set('eyebrow',text('eyebrow'));
  document.getElementById('main-heading').innerHTML=text('heading');set('intro-copy',text('intro'));
  set('where-title',text('where'));set('locate-me',text('locate'));set('place-status',text('placeHelp'));
  document.getElementById('place-search').placeholder=text('placePlaceholder');
  document.getElementById('place-search').setAttribute('aria-label',text('placePlaceholder'));
  document.getElementById('photon-credit').innerHTML=text('placeCredit');
  document.getElementById('place-results').setAttribute('aria-label',language==='no'?'Stedsforslag':'Place suggestions');
  document.getElementById('search').placeholder=text('search');set('section-title',text('section'));
  const note=document.getElementById('estimate-note');
  note.innerHTML=`<strong>${text('noteTitle')}</strong> ${text('note')}`;
  document.getElementById('mode-group').setAttribute('aria-label',text('modeGroup'));
  for(const id of ['all','bus','tram','metro','boat'])set(`mode-${id}`,text(id));
  set('legend-metro',text('metro'));set('legend-tram',text('tram'));set('legend-bus',text('bus'));
  set('legend-boat',text('boat'));set('legend-you',text('you'));set('map-status-label',text('status'));
  document.getElementById('locate').title=language==='no'?'Del posisjonen min':'Share my location';
  document.getElementById('locate').setAttribute('aria-label',document.getElementById('locate').title);
  document.getElementById('lang-en').classList.toggle('active',language==='en');
  document.getElementById('lang-no').classList.toggle('active',language==='no');
  document.getElementById('lang-en').setAttribute('aria-pressed',String(language==='en'));
  document.getElementById('lang-no').setAttribute('aria-pressed',String(language==='no'));
  for(const [id,layers] of routeLayersById){
    const route=routeById.get(id);
    layers.forEach((layer,index)=>{if(index%2===1)layer.bindPopup(`<strong>${modeLabel(route.mode)} ${escapeHTML(route.line)}</strong><br>${escapeHTML(route.description||route.name||'Ruter route')}`)});
  }
  for(const vehicle of vehicleMarkers)vehicle.marker.setTooltipContent(`${modeLabel(vehicle.route.mode)} ${vehicle.route.line} · ${text('marker')}`);
  updateClock();renderList();
}
document.getElementById('lang-en').addEventListener('click',()=>applyLanguage('en'));
document.getElementById('lang-no').addEventListener('click',()=>applyLanguage('no'));
applyLanguage(language);

function updateEstimatedVehicles(){
  const elapsed=(Date.now()-estimatedMotionStarted)/1000;
  for(const vehicle of vehicleMarkers){
    const speed=(modeSpeeds[vehicle.route.mode]||18)/3.6;
    const duration=vehicle.length/speed;
    const progress=((vehicle.phase+elapsed/duration)%1)*vehicle.length;
    vehicle.marker.setLatLng(pointAlong(vehicle.path,progress));
  }
}
updateEstimatedVehicles();setInterval(updateEstimatedVehicles,10000);

let userMarker=null;
function setUserPosition(lat,lng,label){
  if(userMarker)userMarker.setLatLng([lat,lng]);
  else userMarker=L.marker([lat,lng],{icon:L.divIcon({className:'user-pin',html:'<div class="user-dot"></div>',iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:2000}).addTo(map);
  userMarker.setPopupContent(label||'Your location').bindPopup(label||'Your location');
  map.flyTo([lat,lng],15,{duration:.7});
  document.getElementById('place-status').textContent=label||'Your browser location is shown on the map.';
}
function requestLocation(){
  const status=document.getElementById('place-status');
  if(!navigator.geolocation){status.textContent=text('locationUnavailable');return}
  status.textContent=text('waitingLocation');
  navigator.geolocation.getCurrentPosition(position=>setUserPosition(position.coords.latitude,position.coords.longitude,text('browserLocation')),error=>{status.textContent=error.code===1?text('locationDenied'):text('locationFailed')},{enableHighAccuracy:false,timeout:10000,maximumAge:30000});
}
document.getElementById('locate').addEventListener('click',requestLocation);
document.getElementById('locate-me').addEventListener('click',requestLocation);

const placeInput=document.getElementById('place-search');
const placeStatus=document.getElementById('place-status');
const placeResults=document.getElementById('place-results');
let placeTimer=null,placeController=null,lastPlaceQuery=0,foundPlaces=[];
function searchPlaces(){
  const text=placeInput.value.trim();placeResults.replaceChildren();
  if(text.length<3){placeStatus.textContent=windowText('minChars');return}
  if(placeController)placeController.abort();
  placeController=new AbortController();placeStatus.textContent=windowText('searchPlaces');
  const delay=Math.max(0,1000-(Date.now()-lastPlaceQuery));
  setTimeout(async()=>{
    if(placeInput.value.trim()!==text)return;
    lastPlaceQuery=Date.now();
    try{
      const url=new URL('https://photon.komoot.io/api/');
      url.searchParams.set('q',text);url.searchParams.set('lat','59.9139');url.searchParams.set('lon','10.7522');url.searchParams.set('bbox','10.3,59.65,11.7,60.3');url.searchParams.set('limit','5');url.searchParams.set('lang',language==='no'?'no':'en');
      const response=await fetch(url,{signal:placeController.signal});if(!response.ok)throw new Error('Place search unavailable');
      const data=await response.json();foundPlaces=data.features||[];placeResults.replaceChildren();
      foundPlaces.forEach(feature=>{
        const properties=feature.properties||{};
        const label=[properties.name,properties.street,properties.city||properties.locality,properties.state].filter((value,index,array)=>value&&array.indexOf(value)===index).join(', ');
        const option=document.createElement('button');option.type='button';option.className='place-result';option.setAttribute('role','option');option.textContent=label||properties.name||windowText('unnamed');
        option.addEventListener('click',()=>{const [longitude,latitude]=feature.geometry.coordinates;setUserPosition(latitude,longitude,option.textContent);placeInput.value=option.textContent;placeResults.replaceChildren()});placeResults.append(option);
      });
      placeStatus.textContent=foundPlaces.length?windowText('chooseResult'):windowText('noPlaces');
    }catch(error){if(error.name!=='AbortError')placeStatus.textContent=windowText('searchError')}
  },delay);
}
placeInput.addEventListener('input',()=>{clearTimeout(placeTimer);foundPlaces=[];if(placeInput.value.trim().length<3){placeResults.replaceChildren();placeStatus.textContent=windowText('placeHelp');return}placeTimer=setTimeout(searchPlaces,550)});
placeInput.addEventListener('keydown',event=>{if(event.key==='Enter'&&foundPlaces.length){event.preventDefault();placeResults.querySelector('.place-result')?.click()}});

function windowText(key){return copy[language][key]||copy.en[key]||key}
function updateClock(){document.getElementById('clock').textContent=new Intl.DateTimeFormat(text('clockLocale'),{timeZone:'Europe/Oslo',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}
updateClock();setInterval(updateClock,1000);
