import { ActivityMap } from './ActivityMap';
import { QUAD_MAP, QUAD_PINS, QUAD_ROUTES, ZIP_EXTRA_LINES, ZIP_LANDMARKS, ZIP_LINES, ZIP_MAP, ZIP_ROUTES, ZIP_SIGNATURE, ZIP_STATIONS } from '../../data/maps';
import { QUAD_GALLERY, ZIP_GALLERY } from '../../data/mapGalleries';

/** "The quad & buggy trails": the official Quad & Buggy route map with the two loops. */
export function QuadMap() {
  return (
    <ActivityMap
      eyebrow="03 · QUAD & BUGGY · 2 LOOPS"
      title="Quad & buggy trails"
      intro="The official off-road map. The yellow Discovery loop is open to quads and buggies; the red Adventure track is quads only. Pick a loop to light it up, then tap the numbered stops to see what you ride past."
      map={QUAD_MAP}
      alt="Vallé quad and buggy trail map: the yellow Discovery loop and the red Adventure track"
      routes={QUAD_ROUTES}
      pins={QUAD_PINS}
      gallery={QUAD_GALLERY}
      hint="PICK A LOOP · TAP A STOP"
      footNote="Drivers must be 16 or over with a driving licence; passengers must be at least 1 m 30. Standard 450cc quads take one or two riders, exclusive 625cc quads are available on every loop, and the 2+1 seater buggy runs the Discovery loop."
      footTag="YELLOW DISCOVERY · RED ADVENTURE · 2 H ADVENATURE"
    />
  );
}

/** "The zipline network": the official zipline map with the five multi-line tours drawn on top. */
export function ZiplineMap() {
  const pins = [...ZIP_STATIONS, ...ZIP_LANDMARKS];
  return (
    <ActivityMap
      eyebrow="04 · ZIPLINES · 5 TOURS"
      title="The zipline network"
      intro="Every cable in the valley on the official zipline map, plus the bicycle zipline and the Nepalese bridge. Choose a tour and its lines light up, numbered from launch to landing, with dotted walks between platforms. Tap a platform for the view, the height and weight limits and the price."
      map={ZIP_MAP}
      alt="Vallé zipline map: launch platforms, The Signature 1.5 km line, the Coloured Earth and both waterfalls"
      routes={ZIP_ROUTES}
      pins={pins}
      drawRoutes
      lines={ZIP_LINES}
      signature={ZIP_SIGNATURE}
      extraLines={ZIP_EXTRA_LINES}
      gallery={ZIP_GALLERY}
      hint="PICK A TOUR · TAP A PLATFORM"
      footNote="Minimum height 1 m 10 on every tour, 1 m 40 and 40 kg minimum on the tours that include The Signature. Maximum 120 kg, with the limit on The Signature varying with wind direction. Closed shoes, full harness, briefing and guides included."
      footTag="ROUTE LAYOUTS INDICATIVE · WEATHER DEPENDENT"
    />
  );
}
