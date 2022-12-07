const wrapParentheses = (stateMachineConfig, prefix = '', left = '(', right = ')') => {
  return {
    [prefix + 'init']: [
      {
        next: ' ',
        to: prefix + 'init'
      },
      {
        next: left,
        to: prefix + 'leftParentheses',
        before(x){
          console.log(this.level+1,(x===left?'是':'不是')+'左括号')
        }
      },
      {
        next: stateMachineConfig,
        to: prefix + 'noParentheses',
      },
    ],
    [prefix + 'noParentheses']: [
      {
        next: ' ',
        to: prefix + 'noParentheses'
      }
    ],
    [prefix + 'leftParentheses']: [
      {
        next: ' ',
        to: prefix + 'leftParentheses'
      },
    
      {
        next: stateMachineConfig,
        to: prefix + 'needRightParentheses',
        before() {
          console.log(this.level+1,'括号内的表达式')
        }
      },
    ],
    [prefix + 'needRightParentheses']: [
      {
        next: ' ',
        to: prefix + 'needRightParentheses',
      },
      {
        next: right,
        to: prefix + 'wholeParentheses'
      }
    ],
    [prefix + 'wholeParentheses']: [
      {
        next: ' ',
        to: prefix + 'wholeParentheses',
      },
    ]
  }
}

const getWrapParenthesesConfig = (config, prefix = '') => new StateMachine.Config(wrapParentheses(config, prefix), {
  start: prefix + 'init',
  end: [prefix + 'noParentheses', prefix + 'wholeParentheses']
}, {
  id: prefix + '_Parentheses'
})

let Store = {}

const nums = {
  init: [
    {
      next: (x) => {
        return x === '.'
      },
      to: 'decimalPointLeftNotInteger',
    },
    {
      next: ' ',
      to: 'init'
    },
    {
      next: '0',
      to: 'firstZero'
    },
    {
      next: /[0-9]/,
      to: 'integer'
    },
    {
      next: ['+', '-'],
      to: 'sign',
    }
  ],
  sign: [
    {
      next: '.',
      to: 'decimalPointLeftNotInteger',
    },
    {
      next: '0',
      to: 'firstZero'
    },
    {
      next: /[0-9]/,
      to: 'integer'
    },
  ],
  decimalPointLeftNotInteger: [
    {
      next: /[0-9]/,
      to: 'decimal'
    },
  ],
  firstZero: [
    {
      next: '.',
      to: 'pointLeftHasInterger',

    },
    {
      next: ' ',
      to: 'end'
    },
  ],
  integer: [
    {
      next: /[0-9]/,
      to: 'integer'
    },
    {
      next: '.',
      to: 'pointLeftHasInterger',
    },
    {
      next: 'e',
      to: 'e'
    },
    {
      next: ' ',
      to: 'end'
    },
  ],
  pointLeftHasInterger: [
    {
      next: /[0-9]/,
      to: 'decimal'
    },
    {
      next: 'e',
      to: 'e'
    },
    {
      next: ' ',
      to: 'end'
    },
    {
      to: 'end'
    },
  ],
  decimal: [
    {
      next: /[0-9]/,
      to: 'decimal'
    },
    {
      next: ' ',
      to: 'end'
    },
    {
      next: 'e',
      to: 'e'
    },
  ],
  e: [
    {
      next: ['+', '-'],
      to: 'indexSign'
    },
    {
      next: '0',
      to: 'indexFirstZero',
    },
    {
      next: /[1-9]/,
      to: 'indexNum'
    },
  ],
  indexSign: [
    {
      next: '0',
      to: 'indexFirstZero',
    },
    {
      next: /[1-9]/,
      to: 'indexNum'
    },
  ],
  indexFirstZero: [
    {
      next: ' ',
      to: 'end'
    },
  ],
  indexNum: [
    {
      next: /[0-9]/,
      to: 'indexNum'
    },
    {
      next: ' ',
      to: 'end',
    },
  ],
  end: [
    {
      next: ' ',
      to: 'end'
    },
  ],
}
const numsConfig = new StateMachine.Config(nums, { start: 'init', end: ['end', 'firstZero', 'indexNum', 'indexFirstZero', 'decimal', 'integer', 'pointLeftHasInterger'] }, {
  id: 'number'
})

// const numsParenthesesConfig = getWrapParenthesesConfig(numsConfig, 'number_')

const addOrSub = {
  add_init: [
    {
      next: ' ',
      to: 'add_init',
    },
    {
      next: () => Store.testParenthesesConfig,
      to: 'numberNoOperator',
      // before(){
      //   console.log(2)
      // }
    }
  ],
  numberNoOperator: [
    {
      next: ['+', '-'],
      to: 'operator',
      before(x){
        console.log((x === '+'?'加':'减')+ '号')
      }
    },
    {
      next: ' ',
      to: 'numberNoOperator'
    },
  ],
  operator: [
    {
      next: () => Store.testParenthesesConfig,
      to: 'wholeAddSub',
      before(){
        console.log('检测下一个表达式')
      }
    },
    {
      next: ' ',
      to: 'operator'
    }
  ],
  wholeAddSub: [
    {
      next: ' ',
      to: 'wholeAddSub'
    },
    {
      next: ['+', '-'],
      to: 'operator',
      before(x){
        console.log((x === '+'?'加':'减')+ '号')
      }
    },
  ]
}

const addOrSubConfig = new StateMachine.Config(addOrSub, {
  start: 'add_init',
  end: ['wholeAddSub']
}, {
  id: 'addOrSub'
})

// const addOrSubParenthesesConfig = getWrapParenthesesConfig(addOrSubConfig, 'addOrSub_')

const expression = {
  expression_init: [
    {
      next: numsConfig,
      to: 'expression_end',
    }, 
    {
      next: addOrSubConfig,
      to: 'expression_end',
    },
     {
      next(){
        return Store.testParenthesesConfig
      },
      to: 'expression_end'
    },
   
  ],
  expression_end: [
    {
      next: ' ',
      to: 'expression_end'
    }
  ]
}

const expressionConfig = new StateMachine.Config(expression, {
  start: 'expression_init',
  end: 'expression_end'
}, {
  id: 'expression'
})

const testParenthesesConfig = getWrapParenthesesConfig(expressionConfig, 'expression_Parentheses_')

Store.testParenthesesConfig = testParenthesesConfig

function getTestingConfig() {
  return testParenthesesConfig
}