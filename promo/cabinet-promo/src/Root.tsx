import "./index.css";
import { Composition } from "remotion";
import { CabinetVideo } from "./CabinetVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
