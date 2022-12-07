
class StateMachineConfig {
  static uniqueId = 0;
  constructor(transform, statusConfig, other) {
    if(!transform || !statusConfig ){
      throw new Error('参数必须大于等于俩位')
    }
    if(!statusConfig.start || !statusConfig.end) {
      throw new Error('第二个参数必须规定start和end')
    }
    const {start, end} = statusConfig;
    this.uniqueId = Symbol(StateMachineConfig.uniqueId ++)
    this.id = other ? other.id : undefined;
    this.transform = transform
    this.start = start
    this.end = end
  }

}

class StateMachine {
  static Config = StateMachineConfig

  static error = Symbol('$__error__')

  constructor(params) {
    const { 
      parentIndex,
      callStack, 
      disabledConfigSet,
      level
     } = params || {}
    this.parentIndex = parentIndex || 0 
    this.callStack = callStack || []
    this.disabledConfigSet = disabledConfigSet || new Set()
    this.level = level || 0
    this.children = []
    this.parent = null
  }

  pendingMatchStrs() {
    return this.isTestingStrs.slice(this.curStart, this.curEnd)
  }

  getHistory(state, rest) {
    return {
      state,
      test: this.pendingMatchStrs(),
      s:this.parentIndex + this.curStart,
      e: this.parentIndex + this.curEnd,
      selfE: this.curEnd,
      ...(rest || {}),
    }
  }

  pushHistory(x) {
    this.history.push(x)
  }

  popHistory() {
    this.history.pop()
  }

  pushCallStack(x) {
    this.callStack.push(x)
  }

  canMatchState(next, testStr) {
    return (typeof next === 'string' && next === testStr)
      || (Array.isArray(next) && next.includes(testStr))
      || (typeof next === 'function' && next(testStr))
      || ((next instanceof RegExp) && testStr.match(next))
  }

  bindRelationship(instance) {
    this.children.push(instance)
    instance.parent = this
  }

  cycleVisited(target, parentIndex) {
    for(const cs of this.disabledConfigSet) {
      const { stateMachineConfig: x, parentIndex: i } = cs
      if ((x.uniqueId === target.uniqueId || x.id === target.id) && i === parentIndex) {
        return true;
      }
    }
    return false;
  }

  hadInCallStack(target) {
    for(const cs of this.callStack) {
      const { stateMachineConfig: x } = cs
      if (x.uniqueId === target.uniqueId || x.id === target.id) {
        return true;
      }
    }
    return false;
  }
  
  loginMethods() {
    const { transform } = this.stateMachineConfig;
    this.methods = {}
    for (const m in transform) {
      const arr = transform[m]
      this.methods[m] = () => {
        try {
          const ans = []
          const store = [this.curStart, this.curEnd, this.disabledConfigSet]
          for (let { next, to, step, callback, before } of arr) {
            [this.curStart, this.curEnd, this.disabledConfigSet] = store
            if ((next instanceof StateMachine.Config) 
                || (typeof next === 'function' && next() instanceof StateMachine.Config)
                ) {
                  before && before.bind(this)()
                  if (typeof next === 'function') {
                    next = next()
                  } 

              const childStateMachineConfig =  next
   
              if (this.cycleVisited(childStateMachineConfig, this.parentIndex)) {
                const confList = (childStateMachineConfig.transform[childStateMachineConfig.start]
                  .filter(x => x.next instanceof StateMachine.Config))
                  if (confList.length === 0 || !confList.some(x => !this.cycleVisited(
                    x.next,
                    this.parentIndex
                  ))){
                    console.log(
                  [...this.disabledConfigSet].map(x => ({
                  id: x.stateMachineConfig.id,
                  i: x.parentIndex,
                  level: x.level
                })),this.level+1, childStateMachineConfig.id , this.parentIndex, 
                 '退出')
                continue;
                  }
               
              }

              if (this.hadInCallStack(childStateMachineConfig)) {
                this.disabledConfigSet.add({ 
                  stateMachineConfig: this.stateMachineConfig,
                  parentIndex: this.parentIndex,
                  level: this.level,
                })
              }

              const childInstance = new StateMachine({ 
                parentIndex: this.curStart + this.parentIndex,
                callStack: [...this.callStack],
                disabledConfigSet: new Set(this.disabledConfigSet),
                level: this.level + 1
              })

              this.bindRelationship(childInstance);
           
              childInstance.match(this.isTestingStrs.slice(this.curStart), childStateMachineConfig)
              
              const totalHistory = childInstance.history.length ? [{
                history: childInstance.history
              }] : childInstance.errorHistory; // 这里统一判断
              console.log(this.level + 1, 'totalhistory  ' + childStateMachineConfig.id ,totalHistory)
              const totalHistoryLen = totalHistory.length;
              if (totalHistoryLen > 0) {
                const runMap = new Map()
                for(const { history } of totalHistory) {
                  const historyLen = history.length
                  const id = history.map(x => [x.state, x.s, x.e].join('__$__')).join('#')
                  if (historyLen > 1 && !runMap.has(id) ) {
                    runMap.set(id, true)
                    const lastItem = history[historyLen - 1] 
                    if (lastItem && childInstance.canMatchState(childInstance.matchingEndState, lastItem.state)) {
                      this.curEnd = this.curStart + history[historyLen - 2].selfE

                      ans.push({
                        curStart:this.curStart,
                        curEnd: this.curEnd,
                        history: this.getHistory(m, {
                          ...{
                            history: [...history],
                          },
                          ...callback ? (callback(this.pendingMatchStrs()) || {}) : {}
                        }),
                        to,
                      })
                     
                      console.log(this.level + 1, childStateMachineConfig.id, history)

                    } else {
                      console.log(this.level + 1, childStateMachineConfig.id + ' no Match', history)
                    }
                  } else {
                    console.log(this.level + 1, childStateMachineConfig.id, '完全不匹配')
                  }
                } 
                
              } 
            } else {
              const count = step || 1
              this.curEnd = this.curStart + count
              const str = this.pendingMatchStrs();
              before && before.bind(this)(str)
              if (this.canMatchState(next, str)) {
                ans.push({
                  curStart: this.curStart,
                  curEnd: this.curEnd,
                  history: this.getHistory(m, {
                    ...callback ? callback(this.pendingMatchStrs()) : {}
                  }),
                  to,
                })
              }
            }
          }
  
          if(ans.length) {
            return ans
          }

          return [{
            curStart: this.curStart,
            curEnd: this.curEnd,
            history: this.getHistory(m),
            to: this.curEnd > this.testingStrsLen ? m : StateMachine.error
          }]

        } catch (e) {
          console.error(e)
        }
      }
    }
  }

  match(str, stateMachineConfig) {
    if (!stateMachineConfig instanceof StateMachine.Config) {
      throw new Error('必须是配置实例')
    } 
    this.stateMachineConfig = stateMachineConfig
    const { start, end } = stateMachineConfig
    this.matchingEndState = end;
    this.history = []
    this.errorHistory = []
    this.loginMethods()
    this.curStart = 0
    this.curEnd = 0;
    this.isTestingStrs = str;
    this.testingStrsLen = str.length;
    let state = start;
    this.pushCallStack({
      uniqueId: stateMachineConfig.uniqueId,
      stateMachineConfig,
      parentIndex: this.parentIndex,
    })
    console.log(this.level, this.stateMachineConfig.id, this.parentIndex, str)
    try { 
      const errorHistory = []
      const map = new Map()
      const f = (state) => {
        if (this.curEnd > this.testingStrsLen || state === StateMachine.error) {
          return state
        }
        const ans = this.methods[state]()
      
        for(const { curEnd, history, to } of ans) {
          this.curStart = curEnd
          this.curEnd = curEnd
          this.pushHistory(history)
          const g =(to)=> {
            if (Array.isArray(to)) {
              for (const x of to) {
                const curStore = [this.curStart, this.curEnd, [...this.history]]
                const ret = f(x)
                if (this.canMatchState(end, ret)) {
                  return ret
                }
                [this.curStart, this.curEnd, this.history] = curStore
              }
              return StateMachine.error
            }
            return f(to)
          }
          const ret = g(to)
          if (this.canMatchState(end, ret)) {
            return ret
          }
          if (to === StateMachine.error) {
            const id = this.history.map(x => [x.state, x.s, x.e].join('__$__')).join('#')
            if (!map.has(id)) {
              map.set(id, true)
              errorHistory.push({history: [...this.history]})
            }
          }
          this.popHistory()
        }
        if(errorHistory.length) {
          this.errorHistory = [...errorHistory]
        }
        return StateMachine.error
      }
      state = f(start)
      map.clear()
    } catch (e) {
      console.error(e)
    } finally {
      return this.canMatchState(end, state)
    }
  }
}

