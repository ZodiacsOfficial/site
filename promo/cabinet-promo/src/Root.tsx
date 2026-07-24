import "./index.css";
import { Composition } from "remotion";
import { CabinetVideo } from "./CabinetVideo";
import { TheTenth } from "./TheTenth";
import { T } from "./tenth/leaf";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* "The Tenth" — the edition V campaign. Square is the X master: in
          feed it claims the most vertical space without being cropped. */}
      <Composition
        id="TheTenth"
        component={TheTenth}
        durationInFrames={T.end}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="TheTenthVertical"
        component={TheTenth}
        durationInFrames={T.end}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="TheTenthWide"
        component={TheTenth}
        durationInFrames={T.end}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="CabinetPromo"
        component={CabinetVideo}
        durationInFrames={564}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CabinetPromoWide"
        component={CabinetVideo}
        durationInFrames={564}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
