'use strict';
(function () {
  const {int, float, str} = $dep.import(['int', 'float', 'str']);

  const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const rndFromArray = arr => arr[ rndInt(0, arr.length - 1) ];

  $dep
    .export({ rndInt, rndFromArray });
})();
