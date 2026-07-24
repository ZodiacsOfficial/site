import "./index.css";
import { Composition } from "remotion";
import { CabinetVideo } from "./CabinetVideo";
import { TheCabinet } from "./TheCabinet";
import { T } from "./cabinet/palette";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* "The Cabinet of Twelve" — the campaign film. Square is the X master:
          in feed it claims the most vertical space without being cropped. */}
      <Composition
        id="TheCabinet"
        component={TheCabinet}
        durationInFrames={T.end}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="TheCabinetVertical"
        component={TheCabinet}
        durationInFrames={T.end}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="TheCabinetWide"
        component={TheCabinet}
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
