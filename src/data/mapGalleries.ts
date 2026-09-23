// Photo galleries under the activity maps. Source: Vallé photo library (Google Drive "Edited"
// sets), resized for web. Each shot carries the Vallé template fields (tag, caption) and its
// pulse level (1 serene … 5 extreme) so the photo view can show "Thrill with Vallé".

export interface MapShot {
  src: string;
  tag: string;      // short red pill, e.g. "THROUGH THE RIVER"
  cap: string;      // one-line caption under the tag
  thrill: number;   // 1..5
}

export interface MapGallery {
  eyebrow: string;
  t1: string;       // headline line 1 (white)
  t2: string;       // headline line 2 (yellow)
  copy: string;
  foot: string;
  shots: MapShot[];
}

const M = '/images/map/';
const I = '/images/';

export const QUAD_GALLERY: MapGallery = {
  eyebrow: 'STANDARD 450CC OR EXCLUSIVE 625CC · DRIVER 16+ · PASSENGER WELCOME',
  t1: 'Mud, rivers,',
  t2: 'no traffic',
  copy: 'One hour on the Discovery loop or two on the Advenature Tour, guided the whole way. River crossings, forest single track and a ridge above the Coloured Earth with the ocean behind it.',
  foot: 'DRIVING LICENCE REQUIRED · HELMETS PROVIDED · PHOTOS BY VALLÉ',
  shots: [
    { src: M + 'quad-river-splash.webp', tag: 'THROUGH THE RIVER', cap: 'Yes, you go straight through it. Yes, you will get wet.', thrill: 4 },
    { src: M + 'quad-convoy-ocean.webp', tag: 'THE OCEAN RIDGE', cap: 'Family convoy on the Discovery loop with the south coast behind.', thrill: 3 },
    { src: M + 'quad-pov-ridge.webp', tag: 'RIDER’S VIEW', cap: 'Bars in hand, the northern ridge opens up in front of you.', thrill: 3 },
    { src: M + 'quad-coloured-earth-stop.webp', tag: 'COLOURED EARTH STOP', cap: 'Helmets off for the photo above the 23 shades.', thrill: 2 },
    { src: M + 'quad-mud-2.webp', tag: 'THE MUD BOWL', cap: 'The far west of the red track, exactly as promised.', thrill: 4 },
    { src: M + 'quad-duo-speed.webp', tag: 'TWO UP', cap: 'One drives, one holds on and does the screaming.', thrill: 4 },
    { src: M + 'quad-dust-ridge.webp', tag: 'DUST ON THE RIDGE', cap: 'Dry season on the Discovery loop.', thrill: 3 },
    { src: M + 'quad-forest-arms.webp', tag: 'FOREST SINGLETRACK', cap: 'Hands off? Only for the photo.', thrill: 4 },
    { src: M + 'quad-rock-climb.webp', tag: 'ROCK STEP', cap: 'Steep, rocky and slow. The guide goes first.', thrill: 4 },
    { src: M + 'quad-pov-sky.webp', tag: 'THE CLIMB', cap: 'Sky, ridge and a throttle that wants more.', thrill: 3 },
    { src: M + 'quad-forest-speed.webp', tag: 'FULL SEND', cap: 'Forest tunnel, second gear, big grin.', thrill: 4 },
    { src: M + 'quad-family-pair.webp', tag: 'FAMILY CONVOY', cap: 'Two quads, one guide, the whole valley.', thrill: 2 },
    { src: M + 'quad-family-speed.webp', tag: 'SPEED WITH A VIEW', cap: 'The Discovery loop’s fast northern stretch.', thrill: 3 },
    { src: M + 'quad-mud-splash.webp', tag: 'MUD SPLASH', cap: 'Mud is part of the fun. Dress accordingly.', thrill: 4 },
    { src: M + 'quad-dust-trail.webp', tag: 'DUST TRAIL', cap: 'Kicking up the ridge on the way to the Coloured Earth.', thrill: 3 },
    { src: M + 'quad-forest-selfie.webp', tag: 'CANOPY SELFIE', cap: 'A pause under the trees on the red track.', thrill: 2 },
    { src: M + 'quad-forest-glide.webp', tag: 'FOREST GLIDE', cap: 'Singletrack under the canopy before the river ford.', thrill: 3 },
    { src: M + 'quad-duo-laugh.webp', tag: 'PASSENGER SEAT', cap: 'Bring a friend: passengers from 1 m 30.', thrill: 2 },
    { src: M + 'quad-pov-road.webp', tag: 'OPEN ROAD', cap: 'The link between loops, before the dirt begins.', thrill: 2 },
    { src: M + 'quad-river-forest.webp', tag: 'SPLASH', cap: 'The river ford on the way home.', thrill: 3 },
    { src: I + 'buggy-earth.webp', tag: 'BUGGY AT THE COLOURED EARTH', cap: 'The 2+1 seater buggy on the Discovery loop.', thrill: 2 },
    { src: I + 'buggy-river.webp', tag: 'BUGGY RIVER CROSSING', cap: 'Same trails as the quads, more comfort.', thrill: 3 },
    { src: I + 'buggy-forest.webp', tag: 'BUGGY IN THE FOREST', cap: 'Side by side under the canopy.', thrill: 2 },
    { src: I + 'buggy-faces.webp', tag: 'BUGGY 2+1', cap: 'Bring the family along.', thrill: 2 },
    { src: M + 'quad-kazmael-view.webp', tag: 'KAZMAËL VIEWPOINT', cap: 'Vue panoramique from the red track.', thrill: 1 },
    { src: M + 'coloured-earth-family.webp', tag: '23 COLOURED EARTH', cap: 'The loop’s photo stop.', thrill: 1 },
    { src: M + 'waterfall-tall-couple.webp', tag: 'CHEVEUX D’ANGE', cap: 'The angel-hair falls at the far west of the estate.', thrill: 1 },
    { src: M + 'tortoise-farm.webp', tag: 'ANIMAL FARM', cap: 'Giant tortoises beside the last stretch of the red track.', thrill: 1 },
  ],
};

export const ZIP_GALLERY: MapGallery = {
  eyebrow: 'HARNESS, BRIEFING & GUIDES INCLUDED · CLOSED SHOES · WEATHER DEPENDENT',
  t1: 'Fly without',
  t2: 'wings',
  copy: 'Eight tours from a 500 m plunge to the 5.5 km Advenature Flight. Cables over the Coloured Earth, both waterfalls, and The Signature: 1.5 km straight across the valley.',
  foot: 'MIN HEIGHT 1 M 10 · MAX 120 KG · PHOTOS BY VALLÉ',
  shots: [
    { src: M + 'zip-signature-valley.webp', tag: 'THE SIGNATURE', cap: '1.5 km across the valley, arms out.', thrill: 5 },
    { src: M + 'zip-coloured-earth-flight.webp', tag: 'OVER THE 23 COLOURED EARTH', cap: 'Best view in the network, straight below your feet.', thrill: 4 },
    { src: M + 'zip-waterfall-pov.webp', tag: 'WATERFALL CROSSING', cap: 'Rider’s view straight over the Chamouzé cascade.', thrill: 4 },
    { src: M + 'zip-red-flight.webp', tag: 'FLYING POSITION', cap: 'Under 100 kg? You fly The Signature superman-style.', thrill: 5 },
    { src: M + 'zip-valley-meadow.webp', tag: 'OVER THE MEADOWS', cap: 'The long run into the valley hub.', thrill: 3 },
    { src: M + 'zip-canopy.webp', tag: 'CANOPY LINE', cap: 'Treetop to treetop through the western forest.', thrill: 3 },
    { src: M + 'zip-ridge-arms.webp', tag: 'ARMS OUT ON THE RIDGE', cap: 'The northern ridge, whole valley below.', thrill: 3 },
    { src: M + 'zip-signature-valley-2.webp', tag: 'LONG LINE, BIG VIEW', cap: 'Ninety seconds of air on the longest cable in the valley.', thrill: 5 },
    { src: M + 'zip-signature-valley-3.webp', tag: 'INTO THE HUB', cap: 'The Signature lands beside reception.', thrill: 5 },
    { src: M + 'zip-valley-pov.webp', tag: 'VALLEY BELOW', cap: 'Look down. Then look up again.', thrill: 4 },
    { src: M + 'zip-feet-valley.webp', tag: 'FEET OVER THE VALLEY', cap: 'The view from the harness.', thrill: 4 },
    { src: M + 'zip-feet-lake.webp', tag: 'FEET OVER THE LAKE', cap: 'The Plunge, straight down into the hub.', thrill: 4 },
    { src: M + 'zip-waterfall-feet.webp', tag: 'FEET OVER THE FALLS', cap: 'Chamouzé cascade, 200 m of cable.', thrill: 4 },
    { src: M + 'zip-canopy-kick.webp', tag: 'KICK BACK', cap: 'Canopy line on the 10 Flight Trail.', thrill: 4 },
    { src: M + 'zip-valley-kick.webp', tag: 'VALLEY KICK', cap: 'Sky Pulse Tour, line four.', thrill: 4 },
    { src: M + 'zip-selfie-sky.webp', tag: 'SELFIE MID-FLIGHT', cap: 'GoPro mounts available at reception.', thrill: 4 },
    { src: M + 'zip-selfie-cheer.webp', tag: 'CHEER', cap: 'Landing platform, harness still on.', thrill: 3 },
    { src: M + 'zip-ridge-wave.webp', tag: 'RIDGE WAVE', cap: 'Waving at the ground crew on the way to the Coloured Earth.', thrill: 3 },
    { src: M + 'zip-meadow-glide.webp', tag: 'MEADOW GLIDE', cap: 'Low and fast over the valley floor.', thrill: 3 },
    { src: M + 'zip-canopy-fly.webp', tag: 'CANOPY FLIGHT', cap: 'Adventure Tour, western chain.', thrill: 3 },
    { src: M + 'zip-canopy-deep.webp', tag: 'DEEP GREEN', cap: 'Into the forest on the Kazmaël slopes.', thrill: 3 },
    { src: M + 'zip-ridge-sky.webp', tag: 'SKY LINE', cap: 'North ridge platform, Coloured Earth ahead.', thrill: 3 },
    { src: M + 'zip-wave.webp', tag: 'WAVE TO THE GROUND CREW', cap: 'Chamouzé upper platform.', thrill: 3 },
    { src: M + 'zip-launch-selfie.webp', tag: 'LAUNCH TOWER', cap: 'The far-west tower before The Signature.', thrill: 2 },
    { src: M + 'zip-canopy-selfie.webp', tag: 'TREETOP PLATFORM', cap: 'Between lines on the West Canopy.', thrill: 2 },
    { src: M + 'zip-landing.webp', tag: 'LANDING PLATFORM', cap: 'Guides catch you at every platform.', thrill: 2 },
    { src: M + 'bicycle-zipline-pair.webp', tag: 'BICYCLE ZIPLINE', cap: '400 m of cable, pedals in the air.', thrill: 3 },
    { src: M + 'bicycle-zipline-duo.webp', tag: 'PEDAL IN THE AIR', cap: 'Side by side over the valley floor.', thrill: 3 },
    { src: M + 'bicycle-zipline-hill.webp', tag: 'BICYCLE OVER THE LAKE', cap: 'The green line on the map.', thrill: 3 },
    { src: M + 'nepalese-bridge-span.webp', tag: 'NEPALESE BRIDGE', cap: '350 m suspended between the two Kazmaël viewpoints.', thrill: 2 },
    { src: M + 'bridge-walk-sky.webp', tag: 'BRIDGE WALK', cap: 'High over the western ravine.', thrill: 2 },
    { src: M + 'bridge-arms.webp', tag: 'ARMS OUT ON THE BRIDGE', cap: 'Harnessed, clipped in, and smiling.', thrill: 2 },
    { src: M + 'bridge-smile.webp', tag: 'HIGH OVER THE RAVINE', cap: 'The yellow dashed line on the map.', thrill: 2 },
    { src: M + 'coloured-earth-drone.webp', tag: '23 COLOURED EARTH FROM THE AIR', cap: 'The ridge lines fly straight over it.', thrill: 1 },
    { src: M + 'coloured-earth-drone-3.webp', tag: 'THE COLOUR FIELD', cap: 'Volcanic sands in 23 shades that never mix.', thrill: 1 },
    { src: M + 'waterfall-wide-swing.webp', tag: 'VACOAS WATERFALL', cap: 'Below the Vacoas Ridge platform.', thrill: 1 },
    { src: M + 'waterfall-group.webp', tag: 'CHAMOUZÉ FALLS', cap: 'Lunch beside the cascade after your flight.', thrill: 1 },
  ],
};
