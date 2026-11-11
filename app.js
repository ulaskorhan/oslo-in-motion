const routes=window.OSLO_RUTER_ROUTES||[];
const modes=['bus','tram','metro','boat'];
const modeLabels={bus:'Bus',tram:'Trikk',metro:'T-bane',boat:'Boat / ferry'};
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
    line.bindPopup(`<strong>${modeLabels[route.mode]} ${escapeHTML(route.line)}</strong><br>${escapeHTML(route.description||route.name||'Ruter route')}`);
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
      marker.bindTooltip(`${modeLabels[route.mode]} ${route.line} · illustrative position, not live`,{direction:'top',offset:[0,-10]});
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
  const visible=routes.filter(route=>selectedModes.has(route.mode)&&(`${route.line} ${route.name} ${route.description} ${modeLabels[route.mode]}`.toLowerCase().includes(query)));
  routeCount.textContent=`${visible.length} ROUTES`;
  list.innerHTML=visible.map(route=>`<button class="route-item mode-${route.mode}${selectedRouteId===route.id?' selected':''}" data-route-id="${escapeHTML(route.id)}"><span class="line-badge">${escapeHTML(route.line)}</span><span class="route-text"><span class="route-title">${modeLabels[route.mode]} ${escapeHTML(route.line)}</span><span class="route-description">${escapeHTML(route.description||route.name||'Ruter route')}</span></span><span class="route-chevron">↗</span></button>`).join('');
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
  if(!navigator.geolocation){status.textContent='Location is not available in this browser.';return}
  status.textContent='Waiting for your browser’s location permission…';
  navigator.geolocation.getCurrentPosition(position=>setUserPosition(position.coords.latitude,position.coords.longitude,'Your browser location'),error=>{status.textContent=error.code===1?'Location permission was not granted.':'Could not get your location.'},{enableHighAccuracy:false,timeout:10000,maximumAge:30000});
}
document.getElementById('locate').addEventListener('click',requestLocation);
document.getElementById('locate-me').addEventListener('click',requestLocation);

const placeInput=document.getElementById('place-search');
const placeStatus=document.getElementById('place-status');
const placeResults=document.getElementById('place-results');
let placeTimer=null,placeController=null,lastPlaceQuery=0,foundPlaces=[];
function searchPlaces(){
  const text=placeInput.value.trim();placeResults.replaceChildren();
  if(text.length<3){placeStatus.textContent='Enter at least 3 characters to search.';return}
  if(placeController)placeController.abort();
  placeController=new AbortController();placeStatus.textContent='Searching places…';
  const delay=Math.max(0,1000-(Date.now()-lastPlaceQuery));
  setTimeout(async()=>{
    if(placeInput.value.trim()!==text)return;
    lastPlaceQuery=Date.now();
    try{
      const url=new URL('https://photon.komoot.io/api/');
      url.searchParams.set('q',text);url.searchParams.set('lat','59.9139');url.searchParams.set('lon','10.7522');url.searchParams.set('bbox','10.3,59.65,11.7,60.3');url.searchParams.set('limit','5');url.searchParams.set('lang','en');
      const response=await fetch(url,{signal:placeController.signal});if(!response.ok)throw new Error('Place search unavailable');
      const data=await response.json();foundPlaces=data.features||[];placeResults.replaceChildren();
      foundPlaces.forEach(feature=>{
        const properties=feature.properties||{};
        const label=[properties.name,properties.street,properties.city||properties.locality,properties.state].filter((value,index,array)=>value&&array.indexOf(value)===index).join(', ');
        const option=document.createElement('button');option.type='button';option.className='place-result';option.setAttribute('role','option');option.textContent=label||properties.name||'Unnamed place';
        option.addEventListener('click',()=>{const [longitude,latitude]=feature.geometry.coordinates;setUserPosition(latitude,longitude,option.textContent);placeInput.value=option.textContent;placeResults.replaceChildren()});placeResults.append(option);
      });
      placeStatus.textContent=foundPlaces.length?'Choose your place from the results.':'No matching places found in Oslo.';
    }catch(error){if(error.name!=='AbortError')placeStatus.textContent='Place search is unavailable right now. Try browser location.'}
  },delay);
}
placeInput.addEventListener('input',()=>{clearTimeout(placeTimer);foundPlaces=[];if(placeInput.value.trim().length<3){placeResults.replaceChildren();placeStatus.textContent='Choose a place or allow location access.';return}placeTimer=setTimeout(searchPlaces,550)});
placeInput.addEventListener('keydown',event=>{if(event.key==='Enter'&&foundPlaces.length){event.preventDefault();placeResults.querySelector('.place-result')?.click()}});

function updateClock(){document.getElementById('clock').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}
updateClock();setInterval(updateClock,1000);
