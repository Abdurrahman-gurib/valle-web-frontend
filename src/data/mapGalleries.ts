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

import { _t } from '../i18n';

const M = '/images/map/';
const I = '/images/';

export const QUAD_GALLERY: MapGallery = {
  eyebrow: _t('STANDARD 450CC OR EXCLUSIVE 625CC · DRIVER 16+ · PASSENGER WELCOME'),
  t1: _t('Mud, rivers,'),
  t2: _t('no traffic'),
  copy: _t('One hour on the Discovery loop or two on the Advenature Tour, guided the whole way. River crossings, forest single track and a ridge above the Coloured Earth with the ocean behind it.'),
  foot: _t('DRIVING LICENCE REQUIRED · HELMETS PROVIDED · PHOTOS BY VALLÉ'),
  shots: [
    { src: M + 'quad-river-splash.webp', tag: _t('THROUGH THE RIVER'), cap: _t('Yes, you go straight through it. Yes, you will get wet.'), thrill: 4 },
    { src: M + 'quad-convoy-ocean.webp', tag: _t('THE OCEAN RIDGE'), cap: _t('Family convoy on the Discovery loop with the south coast behind.'), thrill: 3 },
    { src: M + 'quad-pov-ridge.webp', tag: _t('RIDER’S VIEW'), cap: _t('Bars in hand, the northern ridge opens up in front of you.'), thrill: 3 },
    { src: M + 'quad-coloured-earth-stop.webp', tag: _t('COLOURED EARTH STOP'), cap: _t('Helmets off for the photo above the 23 shades.'), thrill: 2 },
    { src: M + 'quad-mud-2.webp', tag: _t('THE MUD BOWL'), cap: _t('The far west of the red track, exactly as promised.'), thrill: 4 },
    { src: M + 'quad-duo-speed.webp', tag: _t('TWO UP'), cap: _t('One drives, one holds on and does the screaming.'), thrill: 4 },
    { src: M + 'quad-dust-ridge.webp', tag: _t('DUST ON THE RIDGE'), cap: _t('Dry season on the Discovery loop.'), thrill: 3 },
    { src: M + 'quad-forest-arms.webp', tag: _t('FOREST SINGLETRACK'), cap: _t('Hands off? Only for the photo.'), thrill: 4 },
    { src: M + 'quad-rock-climb.webp', tag: _t('ROCK STEP'), cap: _t('Steep, rocky and slow. The guide goes first.'), thrill: 4 },
    { src: M + 'quad-pov-sky.webp', tag: _t('THE CLIMB'), cap: _t('Sky, ridge and a throttle that wants more.'), thrill: 3 },
    { src: M + 'quad-forest-speed.webp', tag: _t('FULL SEND'), cap: _t('Forest tunnel, second gear, big grin.'), thrill: 4 },
    { src: M + 'quad-family-pair.webp', tag: _t('FAMILY CONVOY'), cap: _t('Two quads, one guide, the whole valley.'), thrill: 2 },
    { src: M + 'quad-family-speed.webp', tag: _t('SPEED WITH A VIEW'), cap: _t('The Discovery loop’s fast northern stretch.'), thrill: 3 },
    { src: M + 'quad-mud-splash.webp', tag: _t('MUD SPLASH'), cap: _t('Mud is part of the fun. Dress accordingly.'), thrill: 4 },
    { src: M + 'quad-dust-trail.webp', tag: _t('DUST TRAIL'), cap: _t('Kicking up the ridge on the way to the Coloured Earth.'), thrill: 3 },
    { src: M + 'quad-forest-selfie.webp', tag: _t('CANOPY SELFIE'), cap: _t('A pause under the trees on the red track.'), thrill: 2 },
    { src: M + 'quad-forest-glide.webp', tag: _t('FOREST GLIDE'), cap: _t('Singletrack under the canopy before the river ford.'), thrill: 3 },
    { src: M + 'quad-duo-laugh.webp', tag: _t('PASSENGER SEAT'), cap: _t('Bring a friend: passengers from 1 m 30.'), thrill: 2 },
    { src: M + 'quad-pov-road.webp', tag: _t('OPEN ROAD'), cap: _t('The link between loops, before the dirt begins.'), thrill: 2 },
    { src: M + 'quad-river-forest.webp', tag: _t('SPLASH'), cap: _t('The river ford on the way home.'), thrill: 3 },
    { src: I + 'buggy-earth.webp', tag: _t('BUGGY AT THE COLOURED EARTH'), cap: _t('The 2+1 seater buggy on the Discovery loop.'), thrill: 2 },
    { src: I + 'buggy-river.webp', tag: _t('BUGGY RIVER CROSSING'), cap: _t('Same trails as the quads, more comfort.'), thrill: 3 },
    { src: I + 'buggy-forest.webp', tag: _t('BUGGY IN THE FOREST'), cap: _t('Side by side under the canopy.'), thrill: 2 },
    { src: I + 'buggy-faces.webp', tag: _t('BUGGY 2+1'), cap: _t('Bring the family along.'), thrill: 2 },
    { src: M + 'quad-kazmael-view.webp', tag: _t('KAZMAËL VIEWPOINT'), cap: _t('Vue panoramique from the red track.'), thrill: 1 },
    { src: M + 'coloured-earth-family.webp', tag: _t('23 COLOURED EARTH'), cap: _t('The loop’s photo stop.'), thrill: 1 },
    { src: M + 'waterfall-tall-couple.webp', tag: _t('CHEVEUX D’ANGE'), cap: _t('The angel-hair falls at the far west of the estate.'), thrill: 1 },
    { src: M + 'tortoise-farm.webp', tag: _t('ANIMAL FARM'), cap: _t('Giant tortoises beside the last stretch of the red track.'), thrill: 1 },
  ],
};

export const ZIP_GALLERY: MapGallery = {
  eyebrow: _t('HARNESS, BRIEFING & GUIDES INCLUDED · CLOSED SHOES · WEATHER DEPENDENT'),
  t1: _t('Fly without'),
  t2: _t('wings'),
  copy: _t('Eight tours from a 500 m plunge to the 5.5 km Advenature Flight. Cables over the Coloured Earth, both waterfalls, and The Signature: 1.5 km straight across the valley.'),
  foot: _t('MIN HEIGHT 1 M 10 · MAX 120 KG · PHOTOS BY VALLÉ'),
  shots: [
    { src: M + 'zip-signature-valley.webp', tag: _t('THE SIGNATURE'), cap: _t('1.5 km across the valley, arms out.'), thrill: 5 },
    { src: M + 'zip-coloured-earth-flight.webp', tag: _t('OVER THE 23 COLOURED EARTH'), cap: _t('Best view in the network, straight below your feet.'), thrill: 4 },
    { src: M + 'zip-waterfall-pov.webp', tag: _t('WATERFALL CROSSING'), cap: _t('Rider’s view straight over the Chamouzé cascade.'), thrill: 4 },
    { src: M + 'zip-red-flight.webp', tag: _t('FLYING POSITION'), cap: _t('Under 100 kg? You fly The Signature superman-style.'), thrill: 5 },
    { src: M + 'zip-valley-meadow.webp', tag: _t('OVER THE MEADOWS'), cap: _t('The long run into the valley hub.'), thrill: 3 },
    { src: M + 'zip-canopy.webp', tag: _t('CANOPY LINE'), cap: _t('Treetop to treetop through the western forest.'), thrill: 3 },
    { src: M + 'zip-ridge-arms.webp', tag: _t('ARMS OUT ON THE RIDGE'), cap: _t('The northern ridge, whole valley below.'), thrill: 3 },
    { src: M + 'zip-signature-valley-2.webp', tag: _t('LONG LINE, BIG VIEW'), cap: _t('Ninety seconds of air on the longest cable in the valley.'), thrill: 5 },
    { src: M + 'zip-signature-valley-3.webp', tag: _t('INTO THE HUB'), cap: _t('The Signature lands beside reception.'), thrill: 5 },
    { src: M + 'zip-valley-pov.webp', tag: _t('VALLEY BELOW'), cap: _t('Look down. Then look up again.'), thrill: 4 },
    { src: M + 'zip-feet-valley.webp', tag: _t('FEET OVER THE VALLEY'), cap: _t('The view from the harness.'), thrill: 4 },
    { src: M + 'zip-feet-lake.webp', tag: _t('FEET OVER THE LAKE'), cap: _t('The Plunge, straight down into the hub.'), thrill: 4 },
    { src: M + 'zip-waterfall-feet.webp', tag: _t('FEET OVER THE FALLS'), cap: _t('Chamouzé cascade, 200 m of cable.'), thrill: 4 },
    { src: M + 'zip-canopy-kick.webp', tag: _t('KICK BACK'), cap: _t('Canopy line on the 10 Flight Trail.'), thrill: 4 },
    { src: M + 'zip-valley-kick.webp', tag: _t('VALLEY KICK'), cap: _t('Sky Pulse Tour, line four.'), thrill: 4 },
    { src: M + 'zip-selfie-sky.webp', tag: _t('SELFIE MID-FLIGHT'), cap: _t('GoPro mounts available at reception.'), thrill: 4 },
    { src: M + 'zip-selfie-cheer.webp', tag: _t('CHEER'), cap: _t('Landing platform, harness still on.'), thrill: 3 },
    { src: M + 'zip-ridge-wave.webp', tag: _t('RIDGE WAVE'), cap: _t('Waving at the ground crew on the way to the Coloured Earth.'), thrill: 3 },
    { src: M + 'zip-meadow-glide.webp', tag: _t('MEADOW GLIDE'), cap: _t('Low and fast over the valley floor.'), thrill: 3 },
    { src: M + 'zip-canopy-fly.webp', tag: _t('CANOPY FLIGHT'), cap: _t('Adventure Tour, western chain.'), thrill: 3 },
    { src: M + 'zip-canopy-deep.webp', tag: _t('DEEP GREEN'), cap: _t('Into the forest on the Kazmaël slopes.'), thrill: 3 },
    { src: M + 'zip-ridge-sky.webp', tag: _t('SKY LINE'), cap: _t('North ridge platform, Coloured Earth ahead.'), thrill: 3 },
    { src: M + 'zip-wave.webp', tag: _t('WAVE TO THE GROUND CREW'), cap: _t('Chamouzé upper platform.'), thrill: 3 },
    { src: M + 'zip-launch-selfie.webp', tag: _t('LAUNCH TOWER'), cap: _t('The far-west tower before The Signature.'), thrill: 2 },
    { src: M + 'zip-canopy-selfie.webp', tag: _t('TREETOP PLATFORM'), cap: _t('Between lines on the West Canopy.'), thrill: 2 },
    { src: M + 'zip-landing.webp', tag: _t('LANDING PLATFORM'), cap: _t('Guides catch you at every platform.'), thrill: 2 },
    { src: M + 'bicycle-zipline-pair.webp', tag: _t('BICYCLE ZIPLINE'), cap: _t('400 m of cable, pedals in the air.'), thrill: 3 },
    { src: M + 'bicycle-zipline-duo.webp', tag: _t('PEDAL IN THE AIR'), cap: _t('Side by side over the valley floor.'), thrill: 3 },
    { src: M + 'bicycle-zipline-hill.webp', tag: _t('BICYCLE OVER THE LAKE'), cap: _t('The green line on the map.'), thrill: 3 },
    { src: M + 'nepalese-bridge-span.webp', tag: _t('NEPALESE BRIDGE'), cap: _t('350 m suspended between the two Kazmaël viewpoints.'), thrill: 2 },
    { src: M + 'bridge-walk-sky.webp', tag: _t('BRIDGE WALK'), cap: _t('High over the western ravine.'), thrill: 2 },
    { src: M + 'bridge-arms.webp', tag: _t('ARMS OUT ON THE BRIDGE'), cap: _t('Harnessed, clipped in, and smiling.'), thrill: 2 },
    { src: M + 'bridge-smile.webp', tag: _t('HIGH OVER THE RAVINE'), cap: _t('The yellow dashed line on the map.'), thrill: 2 },
    { src: M + 'coloured-earth-drone.webp', tag: _t('23 COLOURED EARTH FROM THE AIR'), cap: _t('The ridge lines fly straight over it.'), thrill: 1 },
    { src: M + 'coloured-earth-drone-3.webp', tag: _t('THE COLOUR FIELD'), cap: _t('Volcanic sands in 23 shades that never mix.'), thrill: 1 },
    { src: M + 'waterfall-wide-swing.webp', tag: _t('VACOAS WATERFALL'), cap: _t('Below the Vacoas Ridge platform.'), thrill: 1 },
    { src: M + 'waterfall-group.webp', tag: _t('CHAMOUZÉ FALLS'), cap: _t('Lunch beside the cascade after your flight.'), thrill: 1 },
  ],
};
