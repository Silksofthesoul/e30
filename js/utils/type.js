'use strict';
(function () {
  const int   = val => parseInt(val, 10);
  const float = val => parseFloat(val);
  const str   = val => String(val);

  $dep.export({ int, float, str });
})();
