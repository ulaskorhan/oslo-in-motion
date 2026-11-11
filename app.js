const routes=window.OSLO_RUTER_ROUTES||[];
const modes=['bus','tram','metro','boat'];
const copy={
  en:{brandSub:'A new way to see the city',network:'ESTIMATED MAP',eyebrow:'The city, in motion',heading:'Find your way<br>across Oslo.',intro:'Choose a destination to see which mapped routes pass nearby.',where:'Where are you?',placePlaceholder:'Enter a place in Oslo',locate:'Use my location',placeHelp:'Choose a place or allow location access.',placeCredit:'Place search by <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a> · OpenStreetMap.',destination:'Where are you going?',destinationPlaceholder:'Search a stop or place',destinationHelp:'Try Jernbanetorget, Majorstuen or Aker brygge.',destinationSearching:'Searching destinations…',destinationChoose:'Choose a destination to see routes nearby.',destinationNoRoutes:'No mapped route passes close to this place.',destinationNear:'Mapped routes near',destinationCaveat:'These are route shapes nearby, not confirmed stop departures or live arrival times.',search:'Find a line or destination',section:'Ruter routes crossing Oslo',count:'ROUTES',noteTitle:'Vehicle markers are estimates',note:'Each marker illustrates progress along one scheduled route. It is not a live vehicle location and does not reflect actual service, delays or the number of vehicles running. <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">Data terms</a>.',modeGroup:'Choose transport types',all:'All collective transport',bus:'Bus',tram:'Tram',metro:'T-bane',boat:'Boat / ferry',you:'You',status:'ESTIMATE · NO GPS',searchPlaces:'Searching places…',chooseResult:'Choose your place from the results.',noPlaces:'No matching places found in Oslo.',minChars:'Enter at least 3 characters to search.',searchError:'Place search is unavailable right now. Try browser location.',locationUnavailable:'Location is not available in this browser.',waitingLocation:'Waiting for your browser’s location permission…',locationDenied:'Location permission was not granted.',locationFailed:'Could not get your location.',browserLocation:'Your browser location',unnamed:'Unnamed place',title:'Oslo in Motion — transit map',clockLocale:'en-GB'},
  no:{brandSub:'En ny måte å se byen på',network:'ANSLÅTT KART',eyebrow:'Byen i bevegelse',heading:'Finn veien<br>gjennom Oslo.',intro:'Velg et reisemål for å se hvilke kartlagte linjer som går i nærheten.',where:'Hvor er du?',placePlaceholder:'Skriv inn et sted i Oslo',locate:'Bruk min posisjon',placeHelp:'Søk etter et sted, eller del posisjonen din.',placeCredit:'Stedsøk med <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a> · OpenStreetMap.',destination:'Hvor skal du?',destinationPlaceholder:'Søk etter holdeplass eller sted',destinationHelp:'Prøv Jernbanetorget, Majorstuen eller Aker brygge.',destinationSearching:'Søker etter reisemål …',destinationChoose:'Velg et reisemål for å se linjer i nærheten.',destinationNoRoutes:'Ingen kartlagte linjer passerer nær dette stedet.',destinationNear:'Kartlagte linjer nær',destinationCaveat:'Dette er ruter i nærheten, ikke bekreftede avganger eller sanntid.',search:'Finn en linje eller et reisemål',section:'Ruter-linjer i Oslo-området',count:'LINJER',noteTitle:'Markørene viser anslått bevegelse',note:'Hver markør illustrerer bevegelse langs én rutetrasé. Den viser ikke et faktisk kjøretøy, rutetid, forsinkelse eller hvor mange kjøretøy som er i drift. <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">Datavilkår</a>.',modeGroup:'Velg transporttyper',all:'All kollektivtransport',bus:'Buss',tram:'Trikk',metro:'T-bane',boat:'Båt / ferge',you:'Du',status:'ANSLAG · IKKE GPS',searchPlaces:'Søker etter steder …',chooseResult:'Velg stedet ditt fra trefflisten.',noPlaces:'Fant ingen steder i Oslo som passer.',minChars:'Skriv minst 3 tegn for å søke.',searchError:'Stedsøk er utilgjengelig akkurat nå. Prøv posisjon fra nettleseren.',locationUnavailable:'Posisjon er ikke tilgjengelig i denne nettleseren.',waitingLocation:'Venter på tillatelse til å bruke posisjonen din …',locationDenied:'Du ga ikke tilgang til posisjonen din.',locationFailed:'Kunne ikke hente posisjonen din.',browserLocation:'Posisjonen din fra nettleseren',unnamed:'Ukjent sted',title:'Oslo i bevegelse — kollektivkart',clockLocale:'nb-NO'}
};
Object.assign(copy.en,{nearbyTitle:'NEARBY STOPS',nearbySearching:'Finding nearby stops…',nearbyNone:'No transit stops found nearby.',nearbyError:'Nearby stops could not be loaded. Try again in a moment.',nearbyPrivacy:'Your coordinates are sent to Entur to find nearby stops.',nearbyDistanceNote:'Distances are straight-line.',departuresTitle:'Next departures',departuresLoading:'Loading departures…',departuresError:'Departures are temporarily unavailable.',departuresNone:'No departures in the next hour.',departureNow:'Now',departureLive:'Realtime estimate',departureScheduled:'Scheduled time',vehicleDetailTitle:'Route marker selected',vehicleDetailCopy:'This marker illustrates a route; it is not a specific active trip. Its last-stop and arrival times are not available. Select a nearby stop below to see departures.',close:'Close'});
Object.assign(copy.no,{nearbyTitle:'HOLDEPLASSER I NÆRHETEN',nearbySearching:'Finner holdeplasser i nærheten …',nearbyNone:'Fant ingen holdeplasser i nærheten.',nearbyError:'Kunne ikke hente holdeplasser. Prøv igjen om litt.',nearbyPrivacy:'Posisjonen din sendes til Entur for å finne holdeplasser i nærheten.',nearbyDistanceNote:'Avstandene er målt i luftlinje.',departuresTitle:'Neste avganger',departuresLoading:'Henter avganger …',departuresError:'Avganger er midlertidig utilgjengelige.',departuresNone:'Ingen avganger den neste timen.',departureNow:'Nå',departureLive:'Sanntidsanslag',departureScheduled:'Rutetermin',vehicleDetailTitle:'Rute på kartet valgt',vehicleDetailCopy:'Markøren viser en rute, ikke en bestemt tur i drift. Tidspunkt for siste holdeplass og ankomst er derfor ikke tilgjengelige. Velg en holdeplass i nærheten nedenfor for å se avganger.',close:'Lukk'});
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
      marker.bindTooltip(`${modeLabel(route.mode)} ${route.line}`,{direction:'top',offset:[0,-10]});
      const vehicle={marker,path,length,route,phase:(routeHash(route.id)%1000)/1000};
      marker.on('click',()=>showVehicleDetails(vehicle));
      vehicleMarkers.push(vehicle);
    }
  }
}

const stops=[['Jernbanetorget',59.9128,10.7500],['Nationaltheatret',59.9153,10.7352],['Majorstuen',59.9295,10.7148],['Stortinget',59.9133,10.7460],['Tøyen',59.9146,10.7771],['Grønland',59.9134,10.7613],['Nydalen',59.9554,10.7677],['Blindern',59.9405,10.7167],['Borgen',59.9348,10.6907],['Carl Berners plass',59.9259,10.7773],['Bjørvika',59.9076,10.7572],['Aker brygge',59.9112,10.7275],['Ullevål stadion',59.9491,10.7336],['Ensjø',59.9125,10.7833],['Storo',59.9470,10.7777],['Helsfyr',59.9110,10.8000]];
const stopLayer=L.layerGroup().addTo(map);
const nearbyStopLayer=L.layerGroup().addTo(map);
stops.forEach(stop=>L.marker([stop[1],stop[2]],{icon:L.divIcon({className:'stop-pin',html:'<div class="stop-dot"></div>',iconSize:[9,9],iconAnchor:[4.5,4.5]}),keyboard:false}).bindTooltip(stop[0],{direction:'top',offset:[0,-3],opacity:.88}).addTo(stopLayer));

let selectedModes=new Set(modes);
let query='';
let selectedRouteId=null;
const list=document.getElementById('vehicle-list');
const routeCount=document.getElementById('count');
const modeChecks=[...document.querySelectorAll('[data-mode-checkbox]')];

function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function showVehicleDetails(vehicle){
  selectedVehicleForPanel=vehicle;
  const panel=document.getElementById('vehicle-detail'),route=vehicle.route;
  panel.hidden=false;
  panel.innerHTML=`<div class="vehicle-detail-head"><div class="vehicle-detail-title">${modeLabel(route.mode)} ${escapeHTML(route.line)} · ${escapeHTML(text('vehicleDetailTitle'))}</div><button type="button" class="vehicle-detail-close" aria-label="${escapeHTML(text('close'))}">×</button></div><div class="vehicle-detail-copy">${escapeHTML(route.description||route.name||'')}<br>${escapeHTML(text('vehicleDetailCopy'))}</div>`;
  panel.querySelector('.vehicle-detail-close').addEventListener('click',()=>{panel.hidden=true});
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
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
    syncModeChecks();applyVisibility();renderList();if(destinationPoint)showDestination(destinationPoint,destinationInput.value,false);
  });
}
document.getElementById('search').addEventListener('input',event=>{query=event.target.value.toLowerCase().trim();renderList()});
syncModeChecks();applyVisibility();renderList();

let destinationPoint=null,destinationMarker=null,destinationTimer=null,destinationController=null,destinationQueryId=0;
let selectedVehicleForPanel=null,nearbyStopRecords=[],nearbyStopsController=null,selectedNearbyStop=null,nearbyDepartureController=null,nearbyDepartureRefreshTimer=null;
function applyLanguage(nextLanguage){
  language=nextLanguage==='no'?'no':'en';
  localStorage.setItem('oslo-in-motion-language',language);
  document.documentElement.lang=language;
  document.title=text('title');
  const set=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value};
  set('brand-sub',text('brandSub'));set('network-label',text('network'));set('eyebrow',text('eyebrow'));
  document.getElementById('main-heading').innerHTML=text('heading');set('intro-copy',text('intro'));
  set('destination-title',text('destination'));document.getElementById('destination-search').placeholder=text('destinationPlaceholder');
  document.getElementById('destination-search').setAttribute('aria-label',text('destinationPlaceholder'));
  document.getElementById('destination-results').setAttribute('aria-label',language==='no'?'Forslag til reisemål':'Destination suggestions');
  if(!destinationPoint)document.getElementById('destination-status').textContent=text('destinationHelp');
  set('where-title',text('where'));set('locate-me',text('locate'));set('place-status',text('placeHelp'));
  const privacy=document.getElementById('nearby-privacy');if(privacy&&!privacy.hidden)privacy.textContent=text('nearbyPrivacy');
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
  const detailPanel=document.getElementById('vehicle-detail');if(selectedVehicleForPanel&&detailPanel&&!detailPanel.hidden)showVehicleDetails(selectedVehicleForPanel);
  if(nearbyStopRecords.length)renderNearbyStops();
  if(selectedNearbyStop){const selectedStop=nearbyStopRecords.find(stop=>stop.id===selectedNearbyStop);if(selectedStop)loadStopDepartures(selectedStop)}
  for(const [id,layers] of routeLayersById){
    const route=routeById.get(id);
    layers.forEach((layer,index)=>{if(index%2===1)layer.bindPopup(`<strong>${modeLabel(route.mode)} ${escapeHTML(route.line)}</strong><br>${escapeHTML(route.description||route.name||'Ruter route')}`)});
  }
  for(const vehicle of vehicleMarkers)vehicle.marker.setTooltipContent(`${modeLabel(vehicle.route.mode)} ${vehicle.route.line}`);
  updateClock();renderList();
}
document.getElementById('lang-en').addEventListener('click',()=>applyLanguage('en'));
document.getElementById('lang-no').addEventListener('click',()=>applyLanguage('no'));
applyLanguage(language);

// Destination lookup uses named central stops plus Photon place search. Route
// proximity is derived from the published route shapes; it is not a departure feed.
const destinationInput=document.getElementById('destination-search');
const destinationStatus=document.getElementById('destination-status');
const destinationResults=document.getElementById('destination-results');
const destinationRoutes=document.getElementById('destination-routes');
const destinationClear=document.getElementById('destination-clear');
function distanceToSegmentMeters(point,a,b){
  const scale=Math.cos(point[0]*Math.PI/180), project=p=>[p[1]*111320*scale,p[0]*110540];
  const p=project(point),v=project(a),w=project(b),dx=w[0]-v[0],dy=w[1]-v[1];
  const t=Math.max(0,Math.min(1,((p[0]-v[0])*dx+(p[1]-v[1])*dy)/(dx*dx+dy*dy||1)));
  return map.distance(point,[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
}
function nearbyRoutes(point){
  return routes.map(route=>{
    let nearest=Infinity;
    for(const path of route.paths||[route.points])for(let i=1;i<path.length;i++)nearest=Math.min(nearest,distanceToSegmentMeters(point,path[i-1],path[i]));
    return {route,distance:nearest};
  }).filter(item=>item.distance<250&&selectedModes.has(item.route.mode)).sort((a,b)=>a.distance-b.distance).slice(0,12);
}
function showDestination(point,label,moveMap=true){
  destinationPoint=point;destinationInput.value=label;destinationResults.replaceChildren();destinationClear.hidden=false;
  if(destinationMarker)destinationMarker.setLatLng(point);
  else destinationMarker=L.marker(point,{icon:L.divIcon({className:'user-pin',html:'<div class="user-dot"></div>',iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:1800}).addTo(map);
  destinationMarker.bindTooltip(escapeHTML(label),{direction:'top',offset:[0,-8]});
  if(moveMap)map.flyTo(point,15,{duration:.65});
  const matches=nearbyRoutes(point);
  destinationStatus.textContent=matches.length?`${text('destinationNear')} ${label}`:text('destinationNoRoutes');
  destinationRoutes.innerHTML=matches.map(({route,distance})=>`<button type="button" class="destination-route route-item mode-${route.mode}" data-destination-route="${escapeHTML(route.id)}"><span class="line-badge">${escapeHTML(route.line)}</span><span class="destination-route-copy"><span class="destination-route-name">${modeLabel(route.mode)} ${escapeHTML(route.line)}</span><span class="destination-route-description">${escapeHTML(route.description||route.name||'Ruter route')} · ~${Math.round(distance)} m</span></span></button>`).join('')+`<div class="destination-summary">${text('destinationCaveat')}</div>`;
  destinationRoutes.querySelectorAll('[data-destination-route]').forEach(button=>button.addEventListener('click',()=>selectRoute(button.dataset.destinationRoute)));
}
function addDestinationOption(label,point){const option=document.createElement('button');option.type='button';option.className='place-result';option.setAttribute('role','option');option.textContent=label;option.addEventListener('click',()=>showDestination(point,label));destinationResults.append(option)}
destinationInput.addEventListener('input',()=>{
  clearTimeout(destinationTimer);destinationQueryId++;const query=destinationInput.value.trim();destinationRoutes.replaceChildren();destinationResults.replaceChildren();destinationClear.hidden=!query;
  if(destinationController)destinationController.abort();
  if(query.length<2){destinationStatus.textContent=text('destinationHelp');return}
  const normalized=query.toLocaleLowerCase();
  const matches=stops.filter(stop=>stop[0].toLocaleLowerCase().includes(normalized));
  if(matches.length){const heading=document.createElement('div');heading.className='destination-results-title';heading.textContent=language==='no'?'Holdeplasser':'Stops';destinationResults.append(heading);matches.slice(0,6).forEach(stop=>addDestinationOption(stop[0],[stop[1],stop[2]]))}
  if(query.length<3){destinationStatus.textContent=text('destinationChoose');return}
  const requestId=destinationQueryId;destinationStatus.textContent=text('destinationSearching');
  destinationTimer=setTimeout(async()=>{
    const controller=new AbortController();destinationController=controller;
    try{
      const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',query);url.searchParams.set('lat','59.9139');url.searchParams.set('lon','10.7522');url.searchParams.set('bbox','10.3,59.65,11.7,60.3');url.searchParams.set('limit','5');url.searchParams.set('lang',language==='no'?'no':'en');
      const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error('Destination search failed');const data=await response.json();
      if(requestId!==destinationQueryId)return;
      (data.features||[]).forEach(feature=>{const p=feature.properties||{},label=[p.name,p.street,p.city||p.locality].filter((value,index,array)=>value&&array.indexOf(value)===index).join(', ');const [lon,lat]=feature.geometry.coordinates;if(label&&!matches.some(stop=>stop[0].toLowerCase()===label.toLowerCase()))addDestinationOption(label,[lat,lon])});
      destinationStatus.textContent=destinationResults.querySelector('.place-result')?text('destinationChoose'):text('noPlaces');
    }catch(error){if(error.name!=='AbortError'&&requestId===destinationQueryId)destinationStatus.textContent=text('searchError')}
  },450);
});
destinationInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();destinationResults.querySelector('.place-result')?.click()}});
destinationClear.addEventListener('click',()=>{destinationInput.value='';destinationPoint=null;destinationClear.hidden=true;destinationResults.replaceChildren();destinationRoutes.replaceChildren();destinationStatus.textContent=text('destinationHelp');if(destinationMarker){map.removeLayer(destinationMarker);destinationMarker=null}destinationInput.focus()});

function updateEstimatedVehicles(){
  const elapsed=(Date.now()-estimatedMotionStarted)/1000;
  for(const vehicle of vehicleMarkers){
    const speed=(modeSpeeds[vehicle.route.mode]||18)/3.6;
    const duration=vehicle.length/speed;
    const progress=((vehicle.phase+elapsed/duration)%1)*vehicle.length;
    vehicle.marker.setLatLng(pointAlong(vehicle.path,progress));
  }
}
updateEstimatedVehicles();setInterval(updateEstimatedVehicles,2500);

let userMarker=null;
function setUserPosition(lat,lng,label){
  if(userMarker)userMarker.setLatLng([lat,lng]);
  else userMarker=L.marker([lat,lng],{icon:L.divIcon({className:'user-pin',html:'<div class="user-dot"></div>',iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:2000}).addTo(map);
  userMarker.setPopupContent(label||'Your location').bindPopup(label||'Your location');
  map.flyTo([lat,lng],15,{duration:.7});
  document.getElementById('place-status').textContent=label||'Your browser location is shown on the map.';
  loadNearbyStops(lat,lng);
}
const nearbyStopsBox=document.getElementById('nearby-stops');
const nearbyPrivacy=document.getElementById('nearby-privacy');
function distanceLabel(meters){return meters<1000?`${Math.round(meters)} m`:`${(meters/1000).toFixed(1)} km`}
async function loadNearbyStops(lat,lng){
  if(nearbyStopsController)nearbyStopsController.abort();
  if(nearbyDepartureController)nearbyDepartureController.abort();clearTimeout(nearbyDepartureRefreshTimer);
  nearbyStopsController=new AbortController();nearbyStopRecords=[];selectedNearbyStop=null;nearbyStopLayer.clearLayers();nearbyPrivacy.hidden=false;nearbyPrivacy.textContent=text('nearbyPrivacy');
  nearbyStopsBox.innerHTML=`<div class="nearby-heading">${escapeHTML(text('nearbyTitle'))}</div><div class="where-status">${escapeHTML(text('nearbySearching'))}</div>`;
  try{
    const url=new URL('https://api.entur.io/geocoder/v1/reverse');
    url.searchParams.set('point.lat',String(lat));url.searchParams.set('point.lon',String(lng));url.searchParams.set('boundary.circle.radius','1200');url.searchParams.set('layers','venue');url.searchParams.set('size','12');url.searchParams.set('lang',language==='no'?'no':'en');
    const response=await fetch(url,{signal:nearbyStopsController.signal,headers:{'ET-Client-Name':'oslo-in-motion'}});if(!response.ok)throw new Error('Nearby stop lookup failed');
    const data=await response.json();
    const unique=new Map();
    for(const feature of data.features||[]){
      const p=feature.properties||{},id=p.id||p.gid,name=p.name||p.label;const coords=feature.geometry?.coordinates;
      if(!name||!coords||!['venue','address'].includes(p.layer)||!/(stopplace|quay):/i.test(id||''))continue;
      const stop={id,name,lat:coords[1],lng:coords[0],distance:map.distance([lat,lng],[coords[1],coords[0]])};
      if(!unique.has(id)||unique.get(id).distance>stop.distance)unique.set(id,stop);
    }
    nearbyStopRecords=[...unique.values()].sort((a,b)=>a.distance-b.distance).slice(0,6);
    if(!nearbyStopRecords.length){nearbyStopsBox.innerHTML=`<div class="nearby-heading">${escapeHTML(text('nearbyTitle'))}</div><div class="where-status">${escapeHTML(text('nearbyNone'))}</div>`;return}
    renderNearbyStops([lat,lng]);
  }catch(error){if(error.name!=='AbortError')nearbyStopsBox.innerHTML=`<div class="nearby-heading">${escapeHTML(text('nearbyTitle'))}</div><div class="where-status">${escapeHTML(text('nearbyError'))}</div>`}
}
function renderNearbyStops(userPoint){
  nearbyStopLayer.clearLayers();
  const list=nearbyStopRecords.map((stop,index)=>`<button type="button" class="nearby-stop-button${selectedNearbyStop===stop.id?' active':''}" data-nearby-stop="${index}"><span>${escapeHTML(stop.name)}</span><span class="nearby-stop-distance">${distanceLabel(stop.distance)}</span></button>`).join('');
  nearbyStopsBox.innerHTML=`<div class="nearby-heading">${escapeHTML(text('nearbyTitle'))}</div><div class="nearby-stop-list">${list}</div><div class="nearby-footnote">${escapeHTML(text('nearbyDistanceNote'))}</div>${selectedNearbyStop?'<div id="nearby-departures" class="nearby-departures"></div>':''}`;
  nearbyStopsBox.querySelectorAll('[data-nearby-stop]').forEach(button=>button.addEventListener('click',()=>loadStopDepartures(nearbyStopRecords[Number(button.dataset.nearbyStop)])));
  nearbyStopRecords.forEach(stop=>{
    const marker=L.circleMarker([stop.lat,stop.lng],{radius:6,color:'#176b52',weight:2,fillColor:'#fffefa',fillOpacity:1}).addTo(nearbyStopLayer);
    marker.bindTooltip(stop.name,{direction:'top',offset:[0,-5]});marker.on('click',()=>loadStopDepartures(stop));
  });
}
async function loadStopDepartures(stop){
  if(nearbyDepartureController)nearbyDepartureController.abort();
  clearTimeout(nearbyDepartureRefreshTimer);
  const controller=new AbortController();nearbyDepartureController=controller;selectedNearbyStop=stop.id;renderNearbyStops(userMarker?.getLatLng().toArray()||[stop.lat,stop.lng]);
  const box=document.getElementById('nearby-departures');if(!box)return;
  box.innerHTML=`<div class="nearby-heading">${escapeHTML(text('departuresTitle'))} · ${escapeHTML(stop.name)}</div><div class="where-status">${escapeHTML(text('departuresLoading'))}</div>`;
  const isQuay=/:Quay:/i.test(stop.id),entity=isQuay?'quay':'stopPlace';
  const query=`{ ${entity}(id:${JSON.stringify(stop.id)}) { name estimatedCalls(timeRange:3600,numberOfDepartures:8) { realtime aimedDepartureTime expectedDepartureTime aimedArrivalTime expectedArrivalTime cancellation destinationDisplay { frontText } serviceJourney { journeyPattern { line { publicCode transportMode } } } } } }`;
  try{
    const response=await fetch('https://api.entur.io/journey-planner/v3/graphql',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','ET-Client-Name':'oslo-in-motion'},body:JSON.stringify({query})});
    if(!response.ok)throw new Error('Departure lookup failed');const payload=await response.json();if(payload.errors?.length)throw new Error(payload.errors[0].message);
    const calls=payload.data?.[entity]?.estimatedCalls||[],now=Date.now();
    const departures=calls.map(call=>({call,time:call.expectedDepartureTime||call.expectedArrivalTime||call.aimedDepartureTime||call.aimedArrivalTime})).filter(item=>item.time&&new Date(item.time).getTime()>=now-60000).slice(0,6);
    if(!departures.length){box.innerHTML=`<div class="nearby-heading">${escapeHTML(text('departuresTitle'))} · ${escapeHTML(stop.name)}</div><div class="where-status">${escapeHTML(text('departuresNone'))}</div>`;if(selectedNearbyStop===stop.id&&nearbyDepartureController===controller)nearbyDepartureRefreshTimer=setTimeout(()=>loadStopDepartures(stop),15000);return}
    const clockLocale=text('clockLocale');
    box.innerHTML=`<div class="nearby-heading">${escapeHTML(text('departuresTitle'))} · ${escapeHTML(stop.name)}</div>${departures.map(({call,time})=>{const mins=Math.max(0,Math.round((new Date(time).getTime()-now)/60000)),display=mins<1?text('departureNow'):mins<60?(language==='no'?`om ${mins} min`:`in ${mins} min`):new Intl.DateTimeFormat(clockLocale,{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Oslo'}).format(new Date(time));const line=call.serviceJourney?.journeyPattern?.line?.publicCode||'—';return `<div class="nearby-departure"><span class="nearby-departure-line">${escapeHTML(line)}</span><span class="nearby-departure-destination">${escapeHTML(call.destinationDisplay?.frontText||stop.name)}<small>${escapeHTML(call.realtime?text('departureLive'):text('departureScheduled'))}</small></span><span class="nearby-departure-time" title="${escapeHTML(call.realtime?text('departureLive'):text('departureScheduled'))}">${escapeHTML(display)}${call.cancellation?' · ×':''}</span></div>`}).join('')}`;
  }catch(error){if(error.name!=='AbortError')box.innerHTML=`<div class="nearby-heading">${escapeHTML(text('departuresTitle'))} · ${escapeHTML(stop.name)}</div><div class="where-status">${escapeHTML(text('departuresError'))}</div>`}
  if(selectedNearbyStop===stop.id&&nearbyDepartureController===controller&&!controller.signal.aborted)nearbyDepartureRefreshTimer=setTimeout(()=>loadStopDepartures(stop),15000);
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
