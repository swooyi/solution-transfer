import { transform3x3Algorithm } from "./3x3.js";
import { transformFtoAlgorithm } from "./fto.js";

export function transformAlgorithm(puzzle, algorithm, options = {}) {
  if (puzzle === "3x3") {
    return transform3x3Algorithm(algorithm, options);
  }

  if (puzzle === "fto") {
    return transformFtoAlgorithm(algorithm);
  }

  return {
    baseAlgorithm: "",
    viewpoint: "",
    viewpointInverse: "",
    inverse: "",
    mirrorLeftRight: "",
    mirrorLeftRightInverse: "",
    mirrorFrontBack: "",
    mirrorFrontBackInverse: "",
    mirrorUpDown: "",
    mirrorUpDownInverse: "",
  };
}
