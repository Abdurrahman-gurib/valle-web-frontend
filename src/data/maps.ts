// Static geometry + copy for the two activity maps on the home page
// (Quad & Buggy trails, Zipline network). Pin positions are % of the map image.
// Prices are NOT stored here: they are looked up live in catalog.PL by row prefix.
// Restrictions come from the official "Age / Height / Weight" sheet.

export interface MapPin {
  n: string;                 // short code shown inside the pin
  px: number;                // % from left
  py: number;                // % from top
  kind: 'main' | 'sub';
  name: string;
  sub: string;
  img: string;
  routes?: string[];         // route ids this pin belongs to; undefined = landmark, always shown
  go?: 'detail' | 'chamouze' | 'plan';
  goArg?: string;
  btnLabel?: string;
  facts?: { k: string; v: string }[];   // landmark restrictions (e.g. bicycle zipline)
  priceCat?: string;         // landmark "from" price: catalog.PL key + row prefix
  priceRow?: string;
}

/** A static line drawn on the map in its own colour (bicycle zipline, Nepalese bridge). */
export interface MapLine {
  from: [number, number];
  to: [number, number];
  color: string;
  label: string;
  dashed?: boolean;
}

export interface MapRoute {
  id: string;
  name: string;
  tag: string;               // e.g. "5.5 KM · 11 LINES"
  color: string;
  fg: string;
  blurb: string;
  priceCat: string;          // catalog.PL key
  priceRow: string;          // prefix of the catalog.PL row used for the "from" price
  priceCat2?: string;        // optional second price (e.g. buggy)
  priceRow2?: string;
  priceLabel2?: string;
  facts: { k: string; v: string }[];
  stations?: string[];       // zipline: ordered station pin codes (polyline through them)
  signature?: boolean;       // zipline: includes The Signature 1.5 km line
  img: string;
}

// ---------------------------------------------------------------- QUAD & BUGGY

export const QUAD_MAP = { img: '/images/quad-map-trails-erased.webp', width: 1621, height: 1493 };

const DRIVER = { k: 'DRIVER', v: '16 yrs + · driving licence' };
const PASSENGER = { k: 'PASSENGER', v: 'min 1 m 30' };

export const QUAD_ROUTES: MapRoute[] = [
  {
    id: 'discovery',
    name: 'Discovery Trail',
    tag: '1 H · QUAD & BUGGY · YELLOW LOOP',
    color: '#FFFC33', fg: '#340057',
    blurb: 'The yellow loop: a guided 1 hour ride up the northern ridge, past the 23 Coloured Earth and both waterfalls, then back down to base. Open to quads and buggies.',
    priceCat: 'quad', priceRow: 'Quad Discovery 1 h · standard, single',
    priceCat2: 'buggy', priceRow2: 'Buggy Discovery', priceLabel2: 'BUGGY',
    facts: [DRIVER, PASSENGER, { k: 'VEHICLES', v: 'Standard 450cc · Exclusive 625cc · Buggy 2+1' }],
    img: '/images/map/quad-convoy-ocean.webp',
  },
  {
    id: 'adventure',
    name: 'Adventure Track',
    tag: '1 H · QUAD ONLY · RED LOOP',
    color: '#FF3358', fg: '#FFFFFF',
    blurb: 'The red loop: the wild side of the valley. Mud bowls, forest singletrack and river fords out to the Cheveux d’Ange waterfall and the Kazmaël viewpoint. Quads only.',
    priceCat: 'quad', priceRow: 'Quad Adventure 1 h · standard, single',
    facts: [DRIVER, PASSENGER, { k: 'TERRAIN', v: 'Mud, river crossings, steep forest climbs' }],
    img: '/images/map/quad-river-splash-2.webp',
  },
  {
    id: 'advenature',
    name: 'Advenature Tour',
    tag: '2 H · QUAD · BOTH LOOPS',
    color: '#33FF74', fg: '#340057',
    blurb: 'The full 2 hour expedition: the yellow Discovery loop and the red Adventure track back to back, so you see every waterfall, the Coloured Earth and the far west of the estate.',
    priceCat: 'quad', priceRow: 'Advenature Tour 2 h · standard, single',
    facts: [DRIVER, PASSENGER, { k: 'COMBO', v: 'Explorer’s Drive: Quad Adventure + Discovery Tour zipline' }],
    img: '/images/map/quad-dust-ridge.webp',
  },
];

export const QUAD_PINS: MapPin[] = [
  { n: 'Q', px: 71.3, py: 57.6, kind: 'main', name: 'Quad & Buggy Base', sub: 'Briefing, helmets and the convoy line-up. Both loops start and finish here, a short walk from reception.', img: '/images/map/quad-family-convoy.webp', go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: 'A', px: 66.3, py: 43.8, kind: 'sub', name: 'Park Entrance & Reception', sub: 'Tickets, licence check and the photo kiosk. Parking is just below the gate.', img: '/images/trail-reception.webp', go: 'plan', btnLabel: 'Plan your visit' },
  { n: '1', px: 40.8, py: 25.5, kind: 'main', name: 'The Trail Split', sub: 'Where the yellow Discovery loop and the red Adventure track part ways. Discovery riders head north, Adventure riders dive west.', img: '/images/map/quad-forest-track.webp', routes: ['discovery', 'adventure', 'advenature'], go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: '2', px: 50.5, py: 16.1, kind: 'main', name: 'Northern Ridge Run', sub: 'The high, fast section of the Discovery loop with the whole valley opening up on your right.', img: '/images/map/quad-pov-ridge.webp', routes: ['discovery', 'advenature'], go: 'detail', goArg: 'buggy', btnLabel: 'Buggy details' },
  { n: '3', px: 78.0, py: 27.1, kind: 'main', name: '23 Coloured Earth', sub: 'The loop skirts the 23 Coloured Earth: volcanic sands in 23 shades that never mix. Stop for the photo.', img: '/images/map/quad-coloured-earth-stop.webp', routes: ['discovery', 'advenature'], go: 'detail', goArg: 'coloured', btnLabel: 'About the earth' },
  { n: '4', px: 83.2, py: 31.5, kind: 'main', name: 'Chamouzé Waterfall', sub: 'The convoy pauses above the Chamouzé falls, right beside the restaurant terrace.', img: '/images/chamouze-waterfall.webp', routes: ['discovery', 'advenature'], go: 'detail', goArg: 'waterfalls', btnLabel: 'See the falls' },
  { n: '5', px: 77.1, py: 35.5, kind: 'main', name: 'Vacoas Waterfall', sub: '8 to 9 m high and 16 to 18 m wide, named after the rare Vacoas plants preserved around it.', img: '/images/vacoas-waterfall.webp', routes: ['discovery', 'advenature'], go: 'detail', goArg: 'waterfalls', btnLabel: 'See the falls' },
  { n: '6', px: 33.4, py: 50.9, kind: 'main', name: 'Kazmaël Viewpoint', sub: 'Vue panoramique: the old Kazmaël house on its hilltop, with the south coast on the horizon on a clear day.', img: '/images/map/quad-kazmael-view.webp', routes: ['adventure', 'advenature'], go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: '7', px: 11.0, py: 37.5, kind: 'main', name: 'Cheveux d’Ange Waterfall', sub: 'The “angel hair” falls, the furthest point west of the estate and only reachable on the red track.', img: '/images/map/waterfall-tall-couple.webp', routes: ['adventure', 'advenature'], go: 'detail', goArg: 'waterfalls', btnLabel: 'See the falls' },
  { n: '8', px: 15.4, py: 72.4, kind: 'main', name: 'The Mud Bowl', sub: 'The far west loop: ruts, puddles and the mud you were promised. Dress for it.', img: '/images/map/quad-mud-2.webp', routes: ['adventure', 'advenature'], go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: '9', px: 44.4, py: 76.7, kind: 'main', name: 'Forest Loop & River Ford', sub: 'Singletrack under the canopy with a splash through the river before the climb home.', img: '/images/map/quad-river-splash.webp', routes: ['adventure', 'advenature'], go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: 'AF', px: 65.5, py: 73.3, kind: 'sub', name: 'Animal Farm', sub: 'Giant tortoises, albino deer and the rest of the Green Zone locals, just off the last stretch of the red track.', img: '/images/map/tortoise-farm.webp', go: 'detail', goArg: 'animals', btnLabel: 'Meet the animals' },
];

// ---------------------------------------------------------------- ZIPLINES

export const ZIP_MAP = { img: '/images/zipline-map.webp', width: 1900, height: 1652 };

const ZH110 = { k: 'MIN HEIGHT', v: '1 m 10' };
const ZH140 = { k: 'MIN HEIGHT', v: '1 m 40' };
const ZW40 = { k: 'MIN WEIGHT', v: '40 kg' };
const ZW120 = { k: 'MAX WEIGHT', v: '120 kg' };
const WIND = { k: 'NOTE', v: 'Weight limit varies with wind direction. Includes The Signature 1.5 km (100 kg flying, 150 kg sitting).' };

export const ZIP_ROUTES: MapRoute[] = [
  {
    id: 'plunge',
    name: 'The Plunge',
    tag: '500 M · 1 LINE',
    color: '#5EEAD4', fg: '#340057',
    blurb: 'One long drop from the Valley Canopy platform straight into the valley hub, running right beside the bicycle zipline. The quickest way to find out if you like flying.',
    priceCat: 'zipline', priceRow: 'The Plunge',
    facts: [ZH110, ZW120],
    stations: ['9', '7'],
    img: '/images/map/zip-canopy.webp',
  },
  {
    id: 'waterfall',
    name: 'Waterfall Zipline',
    tag: '300 M · 2 LINES',
    color: '#7DD3FC', fg: '#340057',
    blurb: 'Two lines at the Chamouzé waterfall: 200 m from the summit platform straight over the cascade and the restaurant terrace, then a 100 m hop back up.',
    priceCat: 'zipline', priceRow: 'Waterfall Zipline',
    facts: [ZH110, ZW120],
    stations: ['3', '12', '5'],
    img: '/images/map/zip-waterfall-pov-2.webp',
  },
  {
    id: 'signature',
    name: 'The Signature',
    tag: '1.5 KM · 1 LINE',
    color: '#F472B6', fg: '#340057',
    blurb: 'The longest single cable in the valley: 1.5 km from the far-west tower to the valley hub, flying position under 100 kg, sitting position up to 150 kg.',
    priceCat: 'zipline', priceRow: 'The Signature',
    facts: [ZH140, ZW40, { k: 'MAX WEIGHT', v: '100 kg flying · 150 kg sitting' }, { k: 'NOTE', v: 'Weight limit varies with wind direction.' }],
    stations: ['16', '7'],
    signature: true,
    img: '/images/map/zip-signature-valley.webp',
  },
  {
    id: 'advenature',
    name: 'Advenature Flight',
    tag: '5.5 KM · 11 LINES · WITH THE SIGNATURE',
    color: '#FF3358', fg: '#FFFFFF',
    blurb: 'The complete flight: every cable in the network. It opens with The Signature 1.5 km across the valley, climbs the northern ridge over the Coloured Earth and both waterfalls, then finishes with the western chain up the Kazmaël slopes and back into the hub. Around 3 hours of air time.',
    priceCat: 'zipline', priceRow: 'Advenature Flight',
    facts: [ZH140, ZW40, ZW120, WIND],
    stations: ['16', '7', '1', '4', '2', '10', '3', '12', '5', '6', '11', '15', '14', '13', '8', '9', '7'],
    signature: true,
    img: '/images/map/zip-signature-valley.webp',
  },
  {
    id: 'skypulse',
    name: 'Sky Pulse Tour',
    tag: '3.1 KM · 7 LINES · WITH THE SIGNATURE',
    color: '#FFFC33', fg: '#340057',
    blurb: 'Seven lines built around The Signature: the 1.5 km flight from the far-west tower to the valley hub, then the northern ridge, the Coloured Earth and both waterfall crossings.',
    priceCat: 'zipline', priceRow: 'Sky Pulse Tour',
    facts: [ZH140, ZW40, ZW120, WIND],
    stations: ['16', '7', '1', '4', '6', '11', '2', '10', '3', '12', '5'],
    signature: true,
    img: '/images/map/zip-coloured-earth-flight.webp',
  },
  {
    id: 'tenflight',
    name: '10 Flight Trail',
    tag: '3.5 KM · 10 LINES',
    color: '#33FF74', fg: '#340057',
    blurb: 'Ten lines end to end: the western chain from the south ridge up past Kazmaël, into the valley hub, over the Coloured Earth and down to the waterfalls. No Signature, all the rest.',
    priceCat: 'zipline', priceRow: '10 Flight Trail',
    facts: [ZH110, ZW120],
    stations: ['15', '14', '13', '8', '9', '7', '1', '4', '6', '11', '2', '10', '3', '12', '5'],
    img: '/images/map/zip-canopy.webp',
  },
  {
    id: 'discovery',
    name: 'Discovery Tour',
    tag: '1.6 KM · 7 LINES',
    color: '#FFFFFF', fg: '#340057',
    blurb: 'The classic first zipline: seven short lines from the valley hub near the entrance, over the Coloured Earth ridge and down to the Chamouzé falls.',
    priceCat: 'zipline', priceRow: 'Discovery Tour',
    facts: [ZH110, ZW120],
    stations: ['9', '7', '1', '4', '6', '11', '2', '10', '3', '12', '5'],
    img: '/images/map/zip-waterfall-pov.webp',
  },
  {
    id: 'adventure',
    name: 'Adventure Tour',
    tag: '2.4 KM · 6 LINES',
    color: '#FF9F33', fg: '#340057',
    blurb: 'Six lines on the wild western side: from the south ridge tower up the Kazmaël slopes and through the canopy to the valley hub and the northern ridge.',
    priceCat: 'zipline', priceRow: 'Adventure Tour',
    facts: [ZH110, ZW120],
    stations: ['15', '14', '13', '8', '9', '7', '1', '4'],
    img: '/images/map/zip-valley-meadow.webp',
  },
];

/** The Signature 1.5 km flight: the single cable between these two stations. */
export const ZIP_SIGNATURE: [string, string] = ['16', '7'];

/**
 * Every cable drawn on the official zipline map, as station pairs. A route is a sequence of
 * stations; consecutive stations that are NOT a cable here are a short walk between platforms.
 */
export const ZIP_LINES: [string, string][] = [
  ['16', '7'],   // The Signature
  ['15', '14'], ['14', '13'], ['13', '8'],
  ['9', '7'], ['7', '1'], ['1', '4'],
  ['6', '11'], ['2', '10'], ['3', '12'], ['5', '12'],
];

/** Static lines for the two suspended thrills that sit inside the zipline network. */
export const ZIP_EXTRA_LINES: MapLine[] = [
  { from: [52.9, 40.8], to: [62.0, 32.0], color: '#33FF74', label: 'BICYCLE ZIPLINE' },
  { from: [39.4, 37.2], to: [29.1, 54.9], color: '#FFFC33', label: 'NEPALESE BRIDGE', dashed: true },
];

const zp = (n: string, px: number, py: number, name: string, sub: string, img: string): MapPin => ({
  n, px, py, kind: 'main', name, sub, img, routes: [], go: 'detail', goArg: 'zipline', btnLabel: 'Book ziplines',
});

/** Zipline stations. `routes` is derived at runtime from ZIP_ROUTES.stations. */
export const ZIP_STATIONS: MapPin[] = [
  zp('16', 22.5, 84.1, 'Signature Launch Tower', 'The furthest tower on the estate and the start of The Signature: 1.5 km of cable straight across the valley to the hub, flying position if you are under 100 kg.', '/images/map/zip-launch-selfie.webp'),
  zp('15', 37.1, 78.8, 'South Ridge Tower', 'The bottom of the western chain: from here the lines climb north up the Kazmaël slopes, one platform at a time.', '/images/map/zip-signature-valley-2.webp'),
  zp('14', 33.8, 57.5, 'Kazmaël Slope', 'Mid-way up the western chain, right below the Kazmaël house and the Nepalese bridge.', '/images/map/zip-valley-meadow.webp'),
  zp('13', 40.4, 42.3, 'Kazmaël Viewpoint Platform', 'The platform beside the Kazmaël vue panoramique, where the western chain meets the canopy lines.', '/images/map/zip-valley-selfie.webp'),
  zp('8', 45.7, 35.3, 'West Canopy', 'Top of the western chain. A short walk through the trees takes you to the Valley Canopy platform next door.', '/images/map/zip-canopy.webp'),
  zp('9', 50.1, 36.0, 'Valley Canopy', 'The treetop platform above the bicycle zipline, with one long run down into the valley hub.', '/images/map/zip-canopy-selfie.webp'),
  zp('7', 70.2, 34.9, 'Valley Hub', 'The central station a few minutes from reception. The Signature and the Valley Canopy line both land here; the northern ridge line leaves from here.', '/images/map/zip-landing.webp'),
  zp('1', 63.2, 23.5, 'North Ridge', 'Up onto the northern ridge with the whole valley below your feet.', '/images/map/zip-ridge-arms.webp'),
  zp('4', 70.9, 30.5, 'Coloured Earth Approach', 'The line that brings you over the first stripes of the 23 Coloured Earth.', '/images/map/zip-coloured-earth-flight.webp'),
  zp('2', 83.0, 26.9, 'Coloured Earth Overlook', 'Best view in the network: the full colour field straight below.', '/images/map/zip-coloured-earth-flight-2.webp'),
  zp('6', 76.0, 32.2, 'Coloured Earth South', 'Back across the colour field, heading for the waterfalls.', '/images/map/zip-red-flight.webp'),
  zp('12', 81.8, 40.4, 'Vacoas Falls Landing', 'Two cables land here, right beside the Vacoas waterfall: one from the Coloured Earth ridge, one from Chamouzé Upper.', '/images/map/zip-valley-pov.webp'),
  zp('11', 78.1, 40.5, 'Canopy Landing', 'The end of the Coloured Earth South line, a short walk from the Vacoas falls.', '/images/map/zip-waterfall-pov.webp'),
  zp('10', 85.2, 36.7, 'Chamouzé Landing', 'Where the Coloured Earth Overlook line lands, a few steps from the Chamouzé cascade.', '/images/map/zip-waterfall-pov-2.webp'),
  zp('5', 84.9, 31.1, 'Chamouzé Upper', 'The short 100 m hop back up from the Vacoas falls, the second line of the Waterfall Zipline.', '/images/map/zip-wave.webp'),
  zp('3', 87.7, 27.8, 'Chamouzé Summit', 'Launch of the 200 m waterfall line straight over the Chamouzé cascade down to the Vacoas landing.', '/images/map/zip-summit-line.webp'),
];

export const ZIP_LANDMARKS: MapPin[] = [
  { n: 'A', px: 66.5, py: 47.5, kind: 'sub', name: 'Park Entrance & Briefing', sub: 'Check in at reception, harness up and meet your guides. Every zipline tour is briefed here.', img: '/images/trail-reception.webp', go: 'plan', btnLabel: 'Plan your visit' },
  { n: 'CE', px: 78.0, py: 27.0, kind: 'sub', name: '23 Coloured Earth', sub: 'The ridge lines fly straight over the 23 shades of volcanic sand. Look down.', img: '/images/map/coloured-earth-drone.webp', go: 'detail', goArg: 'coloured', btnLabel: 'About the earth' },
  { n: 'CH', px: 88.6, py: 40.2, kind: 'sub', name: 'Chamouzé Waterfall', sub: 'The cascade beside the Chamouzé restaurant. Lunch after your flight is a good idea.', img: '/images/chamouze-waterfall.webp', go: 'chamouze', btnLabel: 'See the restaurant' },
  { n: 'VW', px: 80.6, py: 45.6, kind: 'sub', name: 'Vacoas Waterfall', sub: '8 to 9 m high and 16 to 18 m wide, with the rare Vacoas plants preserved around it.', img: '/images/vacoas-waterfall.webp', go: 'detail', goArg: 'waterfalls', btnLabel: 'See the falls' },
  { n: 'BZ', px: 57.5, py: 36.4, kind: 'sub', name: 'Bicycle Zipline', sub: 'Pedal a bike along a 400 m cable above the valley floor, feet off the ground the whole way. The green line on the map.', img: '/images/map/bicycle-zipline-pair.webp', go: 'detail', goArg: 'bicycle', btnLabel: 'Bicycle zipline', priceCat: 'bicycle', priceRow: 'Bicycle Zipline', facts: [{ k: 'MIN HEIGHT', v: '1 m 40' }, { k: 'MAX WEIGHT', v: '99 kg' }] },
  { n: 'NB', px: 34.2, py: 46.0, kind: 'sub', name: 'Nepalese Bridge', sub: 'A 350 m suspended footbridge strung between the two Kazmaël viewpoints, high over the western ravine. The yellow dashed line on the map.', img: '/images/map/nepalese-bridge-span.webp', go: 'detail', goArg: 'nepalese', btnLabel: 'Nepalese bridge', priceCat: 'nepalese', priceRow: 'Nepalese Bridge', facts: [{ k: 'MIN HEIGHT', v: '1 m 10' }, { k: 'MAX WEIGHT', v: '150 kg' }] },
  { n: 'KZ', px: 29.5, py: 58.4, kind: 'sub', name: 'Kazmaël Vue Panoramique', sub: 'The hilltop house and its panoramic view over the whole estate: the western launch points sit on its slopes.', img: '/images/map/quad-kazmael-view.webp', go: 'detail', goArg: 'peak', btnLabel: 'Viewpoints' },
];
