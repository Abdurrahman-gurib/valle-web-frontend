import { useReveal } from '../hooks/useReveal';
import { Hero } from './home/Hero';
import { SlopeMarquee } from './home/SlopeMarquee';
import { QuickPlan } from './home/QuickPlan';
import { ParkMap } from './home/ParkMap';
import { ClassicsRail } from './home/ClassicsRail';
import { WildestLocals } from './home/WildestLocals';
import { DineTeasers } from './home/DineTeasers';
import { StorySection } from './home/StorySection';
import { PlanSection } from './home/PlanSection';
import { CtaBanner } from './home/CtaBanner';

export default function HomePage() {
  const ref = useReveal<HTMLElement>();
  return (
    <main ref={ref}>
      <Hero />
      <SlopeMarquee />
      <QuickPlan />
      <ParkMap />
      <ClassicsRail />
      <WildestLocals />
      <DineTeasers />
      <StorySection />
      <PlanSection />
      <CtaBanner />
    </main>
  );
}
