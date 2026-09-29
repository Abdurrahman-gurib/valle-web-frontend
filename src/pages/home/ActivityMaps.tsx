import { ActivityMap } from './ActivityMap';
import { QUAD_KEY, QUAD_MAP, QUAD_PINS, QUAD_ROUTES, ZIP_KEY, ZIP_EXTRA_LINES, ZIP_LANDMARKS, ZIP_LINES, ZIP_MAP, ZIP_ROUTES, ZIP_SIGNATURE, ZIP_STATIONS } from '../../data/maps';
import { QUAD_GALLERY, ZIP_GALLERY } from '../../data/mapGalleries';
import { QUAD_ARROWS, QUAD_TRAILS } from '../../data/quadTrails';
import { useT } from '../../i18n';

/** "The quad & buggy trails": the official Quad & Buggy route map with the two loops. */
export function QuadMap() {
  const t = useT();
  return (
    <ActivityMap
      eyebrow={t('03 · QUAD & BUGGY · 2 LOOPS')}
      title={t('Quad & buggy trails')}
      intro={t('The official off-road map. The yellow Discovery loop is open to quads and buggies; the red Adventure track is quads only. Pick a loop to light it up, then tap the numbered stops to see what you ride past.')}
      map={QUAD_MAP}
      alt={t('Vallé quad and buggy trail map: the yellow Discovery loop and the red Adventure track')}
      routes={QUAD_ROUTES}
      pins={QUAD_PINS}
      trails={QUAD_TRAILS}
      arrows={QUAD_ARROWS}
      gallery={QUAD_GALLERY}
      hint={t('PICK A LOOP · TAP A STOP')}
      sheet={{ title: t('Quad & Buggy Trails'), subtitle: t('OFF-ROAD SITEMAP · 2 LOOPS'), keyItems: QUAD_KEY, foot: t('DISCOVERY ≈ 1 H · ADVENTURE ≈ 1 H · ADVENATURE 2 H · VALLEPARK.COM') }}
      footNote={t('Drivers must be 16 or over with a driving licence; passengers must be at least 1 m 30. Standard 450cc quads take one or two riders, exclusive 625cc quads are available on every loop, and the 2+1 seater buggy runs the Discovery loop.')}
      footTag={t('YELLOW DISCOVERY · RED ADVENTURE · 2 H ADVENATURE')}
    />
  );
}

/** "The zipline network": the official zipline map with the five multi-line tours drawn on top. */
export function ZiplineMap() {
  const t = useT();
  const pins = [...ZIP_STATIONS, ...ZIP_LANDMARKS];
  return (
    <ActivityMap
      eyebrow={t('04 · ZIPLINES · 8 TOURS + 2 THRILLS')}
      defaultRoute="advenature"
      title={t('The zipline network')}
      intro={t('Every cable in the valley on the official zipline map, plus the bicycle zipline and the Nepalese bridge. Choose one of the eight tours and watch its lines trace across the valley, numbered from launch to landing. Tap a platform for the view, the height and weight limits and the price.')}
      map={ZIP_MAP}
      alt={t('Vallé zipline map: launch platforms, The Signature 1.5 km line, the Coloured Earth and both waterfalls')}
      routes={ZIP_ROUTES}
      pins={pins}
      drawRoutes
      lines={ZIP_LINES}
      signature={ZIP_SIGNATURE}
      extraLines={ZIP_EXTRA_LINES}
      gallery={ZIP_GALLERY}
      hint={t('PICK A TOUR · TAP A PLATFORM')}
      sheet={{ title: t('Zipline Network'), subtitle: t('AERIAL SITEMAP · 11 CABLES · 8 TOURS'), keyItems: ZIP_KEY, foot: t('THE SIGNATURE 1.5 KM · ADVENATURE FLIGHT 5.5 KM · VALLEPARK.COM') }}
      footNote={t('Minimum height 1 m 10 on every tour, 1 m 40 and 40 kg minimum on the tours that include The Signature. Maximum 120 kg, with the limit on The Signature varying with wind direction. Closed shoes, full harness, briefing and guides included.')}
      footTag={t('8 TOURS · 1 TO 11 LINES · WEATHER DEPENDENT')}
    />
  );
}
