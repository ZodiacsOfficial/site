import React from 'react';
import { Composition } from 'remotion';
import { Main, type Format } from './Main';
import { DUR, FPS } from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Square"
      component={Main}
      durationInFrames={DUR}
      fps={FPS}
      width={1080}
      height={1080}
      defaultProps={{ format: 'square' as Format }}
    />
    <Composition
      id="Wide"
      component={Main}
      durationInFrames={DUR}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ format: 'wide' as Format }}
    />
    <Composition
      id="Vertical"
      component={Main}
      durationInFrames={DUR}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ format: 'vertical' as Format }}
    />
  </>
);
