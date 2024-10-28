import { DependencyList, EffectCallback, useEffect, useRef } from "react";

const useSkipInitialEffect = (
  callback: EffectCallback,
  dependencies: DependencyList,
) => {
  const hasMounted = useRef(false);

  useEffect(() => {
    if (hasMounted.current) {
      callback();
    } else {
      hasMounted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

export default useSkipInitialEffect;
