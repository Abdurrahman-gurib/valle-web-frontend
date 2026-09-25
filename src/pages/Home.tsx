import { abs, useSeo } from '../lib/seo';
import { useReveal } from '../hooks/useReveal';
import { Hero } from './home/Hero';
import { SlopeMarquee } from './home/SlopeMarquee';
import { QuickPlan } from './home/QuickPlan';
import { ParkMap } from './home/ParkMap';
import { QuadMap, ZiplineMap } from './home/ActivityMaps';
import { ClassicsRail } from './home/ClassicsRail';
import { WildestLocals } from './home/WildestLocals';
import { DineTeasers } from './home/DineTeasers';
import { StorySection } from './home/StorySection';
import { PlanSection } from './home/PlanSection';
import { CtaBanner } from './home/CtaBanner';

export default function HomePage() {
  useSeo({ title: 'VALLÉ Advenature™ Park · Ziplines, quad trails & nature in Chamouny, Mauritius', description: 'Fly the longest ziplines in Mauritius, ride quad and buggy trails, walk to two waterfalls and the 23 Coloured Earth, and let the kids loose in their own park. Open daily in Chamouny.', canonicalPath: '/', jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'VALLÉ Advenature™ Park', url: abs('/'), potentialAction: { '@type': 'SearchAction', target: abs('/explore?q={search_term_string}'), 'query-input': 'required name=search_term_string' } }] });
  const ref = useReveal<HTMLElement>();
  return (
    <main ref={ref}>
      <Hero />
      <SlopeMarquee />
      <QuickPlan />
      <ParkMap />
      <QuadMap />
      <ZiplineMap />
      <ClassicsRail />
      <WildestLocals />
      <DineTeasers />
      <StorySection />
      <PlanSection />
      <CtaBanner />
    </main>
  );
}
