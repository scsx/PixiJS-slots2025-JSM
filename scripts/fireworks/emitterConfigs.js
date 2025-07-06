// Based on https://github.com/pixijs/particle-emitter/blob/master/docs/examples/fountain.html
export const fountainConfig = {
  lifetime: {
    min: 0.25,
    max: 1
  },
  frequency: 0.001,
  emitterLifetime: 0,
  maxParticles: 1000,
  addAtBack: false,
  pos: {
    x: 0,
    y: 0
  },
  behaviors: [
    {
      type: 'alpha',
      config: {
        alpha: {
          list: [
            {
              time: 0,
              value: 1
            },
            {
              time: 1,
              value: 0.31
            }
          ]
        }
      }
    },
    {
      type: 'moveAcceleration',
      config: {
        accel: {
          x: 0,
          y: 1000
        },
        minStart: 700,
        maxStart: 700,
        rotate: true
      }
    },
    {
      type: 'scale',
      config: {
        scale: {
          list: [
            {
              time: 0,
              value: 1
            },
            {
              time: 1,
              value: 2
            }
          ]
        },
        minMult: 1
      }
    },
    {
      type: 'color',
      config: {
        color: {
          list: [
            {
              time: 0,
              value: 'ffffff'
            },
            {
              time: 1,
              value: '9ff3ff'
            }
          ]
        }
      }
    },
    {
      type: 'rotationStatic',
      config: {
        min: 260,
        max: 280
      }
    },
    {
      type: 'textureRandom',
      config: {
        textures: ['assets/fountain.png']
      }
    },
    {
      type: 'spawnShape',
      config: {
        type: 'torus',
        data: {
          x: 0,
          y: 0,
          radius: 0,
          innerRadius: 0,
          affectRotation: false
        }
      }
    }
  ]
}
