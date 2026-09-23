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

export const QUAD_MAP = { img: '/images/quad-map.webp', width: 1741, height: 1613 };

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
  { n: 'Q', px: 69.8, py: 57.0, kind: 'main', name: 'Quad & Buggy Base', sub: 'Briefing, helmets and the convoy line-up. Both loops start and finish here, a short walk from reception.', img: '/images/map/quad-family-convoy.webp', go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: 'A', px: 65.2, py: 44.3, kind: 'sub', name: 'Park Entrance & Reception', sub: 'Tickets, licence check and the photo kiosk. Parking is just below the gate.', img: '/images/trail-reception.webp', go: 'plan', btnLabel: 'Plan your visit' },
  { n: '1', px: 41.4, py: 27.3, kind: 'main', name: 'The Trail Split', sub: 'Where the yellow Discovery loop and the red Adventure track part ways. Discovery riders head north, Adventure riders dive west.', img: '/images/map/quad-forest-track.webp', routes: ['discovery', 'adventure', 'advenature'], go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: '2', px: 50.5, py: 18.6, kind: 'main', name: 'Northern Ridge Run', sub: 'The high, fast section of the Discovery loop with the whole valley opening up on your right.', img: '/images/map/quad-pov-ridge.webp', routes: ['discovery', 'advenature'], go: 'detail', goArg: 'buggy', btnLabel: 'Buggy details' },
  { n: '3', px: 76.1, py: 28.8, kind: 'main', name: '23 Coloured Earth', sub: 'The loop skirts the 23 Coloured Earth: volcanic sands in 23 shades that never mix. Stop for the photo.', img: '/images/map/quad-coloured-earth-stop.webp', routes: ['discovery', 'advenature'], go: 'detail', goArg: 'coloured', btnLabel: 'About the earth' },
  { n: '4', px: 80.9, py: 32.9, kind: 'main', name: 'Chamouzé Waterfall', sub: 'The convoy pauses above the Chamouzé falls, right beside the restaurant terrace.', img: '/images/chamouze-waterfall.webp', routes: ['discovery', 'advenature'], go: 'detail', goArg: 'waterfalls', btnLabel: 'See the falls' },
  { n: '5', px: 75.2, py: 36.6, kind: 'main', name: 'Vacoas Waterfall', sub: '8 to 9 m high and 16 to 18 m wide, named after the rare Vacoas plants preserved around it.', img: '/images/vacoas-waterfall.webp', routes: ['discovery', 'advenature'], go: 'detail', goArg: 'waterfalls', btnLabel: 'See the falls' },
  { n: '6', px: 34.5, py: 50.8, kind: 'main', name: 'Kazmaël Viewpoint', sub: 'Vue panoramique: the old Kazmaël house on its hilltop, with the south coast on the horizon on a clear day.', img: '/images/map/quad-kazmael-view.webp', routes: ['adventure', 'advenature'], go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: '7', px: 13.7, py: 38.4, kind: 'main', name: 'Cheveux d’Ange Waterfall', sub: 'The “angel hair” falls, the furthest point west of the estate and only reachable on the red track.', img: '/images/map/waterfall-tall-couple.webp', routes: ['adventure', 'advenature'], go: 'detail', goArg: 'waterfalls', btnLabel: 'See the falls' },
  { n: '8', px: 17.8, py: 70.7, kind: 'main', name: 'The Mud Bowl', sub: 'The far west loop: ruts, puddles and the mud you were promised. Dress for it.', img: '/images/map/quad-mud-2.webp', routes: ['adventure', 'advenature'], go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: '9', px: 44.8, py: 74.7, kind: 'main', name: 'Forest Loop & River Ford', sub: 'Singletrack under the canopy with a splash through the river before the climb home.', img: '/images/map/quad-river-splash.webp', routes: ['adventure', 'advenature'], go: 'detail', goArg: 'quad', btnLabel: 'Quad details' },
  { n: 'AF', px: 64.4, py: 71.6, kind: 'sub', name: 'Animal Farm', sub: 'Giant tortoises, albino deer and the rest of the Green Zone locals, just off the last stretch of the red track.', img: '/images/map/tortoise-farm.webp', go: 'detail', goArg: 'animals', btnLabel: 'Meet the animals' },
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
    id: 'advenature',
    name: 'Advenature Flight',
    tag: '5.5 KM · 11 LINES · WITH THE SIGNATURE',
    color: '#FF3358', fg: '#FFFFFF',
    blurb: 'The complete flight: every line in the network back to back, from the far-west launch through The Signature 1.5 km, over the Coloured Earth and both waterfalls. Around 3 hours of air time.',
    priceCat: 'zipline', priceRow: 'Advenature Flight',
    facts: [ZH140, ZW40, ZW120, WIND],
    stations: ['16', '15', '7', '1', '4', '2', '6', '12', '11', '10', '5', '3'],
    signature: true,
    img: '/images/map/zip-signature-valley.webp',
  },
  {
    id: 'skypulse',
    name: 'Sky Pulse Tour',
    tag: '3.1 KM · 7 LINES · WITH THE SIGNATURE',
    color: '#FFFC33', fg: '#340057',
    blurb: 'Seven lines built around The Signature: the 1.5 km flight across the valley, then a chain of ridge lines out to the Coloured Earth and the Vacoas falls.',
    priceCat: 'zipline', priceRow: 'Sky Pulse Tour',
    facts: [ZH140, ZW40, ZW120, WIND],
    stations: ['14', '15', '7', '1', '4', '2', '6', '12'],
    signature: true,
    img: '/images/map/zip-coloured-earth-flight.webp',
  },
  {
    id: 'tenflight',
    name: '10 Flight Trail',
    tag: '3.5 KM · 10 LINES',
    color: '#33FF74', fg: '#340057',
    blurb: 'Ten lines strung along the eastern valley: canopy hops, the Coloured Earth ridge and the double waterfall crossing, without the long Signature flight.',
    priceCat: 'zipline', priceRow: '10 Flight Trail',
    facts: [ZH110, ZW120],
    stations: ['9', '7', '1', '4', '2', '6', '12', '11', '10', '5', '3'],
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
    stations: ['7', '1', '4', '2', '6', '12', '11', '10'],
    img: '/images/map/zip-waterfall-pov.webp',
  },
  {
    id: 'adventure',
    name: 'Adventure Tour',
    tag: '2.4 KM · 6 LINES',
    color: '#FF9F33', fg: '#340057',
    blurb: 'Six longer lines from the Kazmaël slope through the western canopy to the valley hub and up the northern ridge to the Coloured Earth.',
    priceCat: 'zipline', priceRow: 'Adventure Tour',
    facts: [ZH110, ZW120],
    stations: ['13', '8', '9', '7', '1', '4', '2'],
    img: '/images/map/zip-valley-meadow.webp',
  },
];

/** The Signature 1.5 km flight: the single line between these two stations. */
export const ZIP_SIGNATURE: [string, string] = ['15', '7'];

const zp = (n: string, px: number, py: number, name: string, sub: string, img: string): MapPin => ({
  n, px, py, kind: 'main', name, sub, img, routes: [], go: 'detail', goArg: 'zipline', btnLabel: 'Book ziplines',
});

/** Zipline stations. `routes` is derived at runtime from ZIP_ROUTES.stations. */
export const ZIP_STATIONS: MapPin[] = [
  zp('16', 22.5, 84.1, 'Far-West Launch', 'The furthest launch tower on the estate and the start of the Advenature Flight. First line of the day, longest walk to get there.', '/images/map/zip-launch-selfie.webp'),
  zp('15', 37.1, 78.8, 'South Ridge Tower', 'The Signature launches from here: 1.5 km of cable straight across the valley, flying position if you are under 100 kg.', '/images/map/zip-signature-valley-2.webp'),
  zp('14', 33.8, 57.5, 'Kazmaël Slope', 'Sky Pulse riders start on the slope below the Kazmaël viewpoint and warm up with one line down to the south ridge.', '/images/map/zip-valley-meadow.webp'),
  zp('13', 40.4, 42.3, 'Kazmaël Viewpoint Launch', 'The Adventure Tour starts right under the Kazmaël vue panoramique, so the first line drops into the western canopy.', '/images/map/zip-valley-selfie.webp'),
  zp('8', 45.7, 35.3, 'West Canopy', 'A short hop between treetop platforms in the western forest.', '/images/map/zip-canopy.webp'),
  zp('9', 50.1, 36.0, 'Valley Canopy', 'The last treetop platform before the long run into the valley hub.', '/images/map/zip-canopy-selfie.webp'),
  zp('7', 70.2, 34.9, 'Valley Hub', 'The central station a few minutes from reception. The Signature lands here, and the Discovery Tour starts here.', '/images/map/zip-landing.webp'),
  zp('1', 63.2, 23.5, 'North Ridge', 'Up onto the northern ridge with the whole valley below your feet.', '/images/map/zip-ridge-arms.webp'),
  zp('4', 70.9, 30.5, 'Coloured Earth Approach', 'The line that brings you over the first stripes of the 23 Coloured Earth.', '/images/map/zip-coloured-earth-flight.webp'),
  zp('2', 83.0, 26.9, 'Coloured Earth Overlook', 'Best view in the network: the full colour field straight below.', '/images/map/zip-coloured-earth-flight-2.webp'),
  zp('6', 76.0, 32.2, 'Coloured Earth South', 'Back across the colour field, heading for the waterfalls.', '/images/map/zip-red-flight.webp'),
  zp('12', 81.8, 40.4, 'Vacoas Ridge', 'The platform above the Vacoas waterfall. Sky Pulse riders finish here.', '/images/map/zip-valley-pov.webp'),
  zp('11', 78.1, 40.5, 'Vacoas Falls Landing', 'A short line down beside the Vacoas falls, 8 to 9 m of white water on your left.', '/images/map/zip-waterfall-pov.webp'),
  zp('10', 85.2, 36.7, 'Chamouzé Falls Crossing', 'The waterfall crossing: straight over the Chamouzé cascade and the restaurant terrace.', '/images/map/zip-waterfall-pov-2.webp'),
  zp('5', 84.9, 31.1, 'Chamouzé Upper', 'Climbing back above the falls for the last two lines.', '/images/map/zip-wave.webp'),
  zp('3', 87.7, 27.8, 'Chamouzé Summit', 'The final platform of the 10 Flight Trail and the Advenature Flight. Harness off, photos on.', '/images/map/zip-summit-line.webp'),
];

export const ZIP_LANDMARKS: MapPin[] = [
  { n: 'A', px: 66.5, py: 47.5, kind: 'sub', name: 'Park Entrance & Briefing', sub: 'Check in at reception, harness up and meet your guides. Every zipline tour is briefed here.', img: '/images/trail-reception.webp', go: 'plan', btnLabel: 'Plan your visit' },
  { n: 'CE', px: 78.0, py: 27.0, kind: 'sub', name: '23 Coloured Earth', sub: 'The ridge lines fly straight over the 23 shades of volcanic sand. Look down.', img: '/images/map/coloured-earth-drone.webp', go: 'detail', goArg: 'coloured', btnLabel: 'About the earth' },
  { n: 'CH', px: 88.6, py: 40.2, kind: 'sub', name: 'Chamouzé Waterfall', sub: 'The cascade beside the Chamouzé restaurant. Lunch after your flight is a good idea.', img: '/images/chamouze-waterfall.webp', go: 'chamouze', btnLabel: 'See the restaurant' },
  { n: 'VW', px: 80.6, py: 45.6, kind: 'sub', name: 'Vacoas Waterfall', sub: '8 to 9 m high and 16 to 18 m wide, with the rare Vacoas plants preserved around it.', img: '/images/vacoas-waterfall.webp', go: 'detail', goArg: 'waterfalls', btnLabel: 'See the falls' },
  { n: 'KZ', px: 29.5, py: 58.4, kind: 'sub', name: 'Kazmaël Vue Panoramique', sub: 'The hilltop house and its panoramic view over the whole estate: the western launch points sit on its slopes.', img: '/images/map/quad-kazmael-view.webp', go: 'detail', goArg: 'peak', btnLabel: 'Viewpoints' },
];
