'use strict';
(function () {
  const altQueue = (...fns) => {
    return function(val) {
      let res = false;
      for (let f of fns) {
        res = f(val);
        if (res !== false) return res;
      }
    };
  };

  $dep
    .export({ altQueue });
})();
