import { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

export default function SplineHeroBackground() {
  return (
    <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
      <Suspense fallback={<div className="absolute inset-0 bg-[#07090D]" />}>
        <Spline
          scene="https://prod.spline.design/Rwu07c4L33iNvfaa/scene.splinecode"
          className="h-full w-full"
        />
      </Suspense>
    </div>
  );
}
