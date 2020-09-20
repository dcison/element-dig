---
author: Dcison
name: 元素埋点曝光组件
---

# 元素埋点曝光组件

## 简单介绍

基于React-HOC 开发的**元素**级别的 埋点组件，含有以下几种场景下的自动埋点发送功能

* 元素渲染即曝光（默认方式，方式名为 normal）
* 元素进入到可视区域内才进行曝光 （方式名为 viewonce）
* 元素进入到可视区域次数 （方式名为 view）
* 元素渲染到销毁的时长，可以大略认为是该元素的停留时长 （方式名为time）
* 元素进入到可视区后到销毁的时长 （方式名为timeSinceView）

支持一定程度上的耦合使用，比如 time + normal，time + view等

该组件适用场景主要是：

1. 在前端领域中是一个页面，而在业务场景中是不同页面，PM需要统计不同的埋点参数。
比如：Tab页，对前端来说是一个页面下的内容，而对业务，不同Tab下的每个内容都是独立的，需要分别统计。（当然这种情况可以用点击代替元素曝光）
2. 监听真正滚动到可视区域内的元素，反馈开发的内容真正的使用情况

**注意**

~~基于 IntersectionObserver 开发，请检查兼容性问题：https://caniuse.com/#search=IntersectionObserver~~

已使用 IntersectionObserver [polyfill](https://github.com/w3c/IntersectionObserver/tree/master/polyfill) ，目前的兼容性如下：

Chrome | Firefox | Safari | Edge | IE | Opera | Android
 - | - | - | - | - | - | - |
√ | √ | 6+ | √ | 7+ | √ | 4.4+


## 使用

### 引入组件

``` javascript
import Exposure from './index';
```

### 初始化

需要在使用该组件前，为组件进行初始化，主要是传入本项目中的发送埋点函数，因为各个项目的函数发送方式不一样，因此交由使用方自行初始化控制

``` javascript
import { initDig } from './index.js';
initDig((evt,parmas,action)=>{
    console.log(
            `打印出参数：%c evt=${evt} %c parmas=${JSON.stringify(parmas)} %c action=${JSON.stringify(action)}`,
            'color:#99CCCC;font-size: 16px;',
            'color:#FFCC99;font-size: 16px;',
            'color:#CCCCFF;font-size: 16px;',
    )
})
```

**参考的send代码**

``` javascript
send(evtId, evtParams = {}, sourceParams = {}) { // 通用发送埋点请求
    // evt:事件ID（evt_ID）,evtParams 埋点中除了pid、action的字段，sourceParams  埋点参数中的action字段
    window.send(evtId, this.getAllParams(evtParams, sourceParams)); // window.send 是真正发埋点的函数
}

getAllParams(evtParams = {}, sourceParams = {}) {
    return {
        event: evtParams.event, // 事件的类型id
        uicode: evtParams.uicode, // 配置平台业务问题
        stt: evtParams.stt, // 停留时间
        action: {
            user_id: xxxx,
            user_name: xxxx,
            user_role: xxx,
            ...sourceParams,
        },
    };
}
```

**注意**：

* 目前发现有些项目中除 action 参数是写死的，导致 evtParmas 实际传递也无效，此时可以放入到 action 参数中，具体情况视项目而定。
* 使用时间模式时（time || timeSinceView），可以不传evtId，默认是2（作者业务方的习惯）


### Demo

下面会展示了部分埋点组件的用法，注意观察控制台中的信息

#### 元素渲染曝光

说明：只要加载该元素即对该元素进行曝光

``` javascript
    <Exposure 
        digData={{
            evt: 200000,
            evtParams: {
                event: 'ItemExpo',
                uicode: '元素UIcode',
            },
            actionParams: {
                special: '元素简单曝光'
            }
        }}
    >
        此处放入将被曝光的元素
    </Exposure>
```

#### 元素在可视区域内单次曝光

说明：在该元素出现在视窗时才对该元素进行曝光，且只会曝光一次

``` javascript
<Exposure 
    mode={['viewonce']}
    digData={{
        evt: 200000,
        evtParams: {
            event: 'ItemExpo',
            uicode: '元素UIcode',
        },
        actionParams: {
            special: '元素可视区域内曝光'
        }
    }}
>
    此处放入将被曝光的元素
</Exposure>

```

#### 元素出现在可视区域内的次数曝光

说明：统计该元素出现在可视区域内的次数，不可与**单次曝光(mode = 'viewonce')**一起使用，如果一起使用，只会统计元素出现在可视区域内的次数。

统计发送的时机是该元素被销毁时发送，会在evtParams增加次数字段。


``` javascript
{
    () => {
    class Demo extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
                show: true,
            };
        }
        render() {
            return (
                 <div>
                        {
                            this.state.show ? <Exposure 
                                mode={['view']}
                                digData={{
                                    evt: 200000,
                                    evtParams: {
                                        event: 'ItemExpo',
                                        uicode: '元素UIcode',
                                    },
                                    actionParams: {
                                        special: '元素出现在可视区曝光'
                                    }
                                }}
                            >
                                此处放入将被曝光的元素
                            </Exposure> 
                            : '注意观察控制台的action参数'
                        }
                    <button onClick={() => {
                        this.setState({show: !this.state.show})}
                    }>
                        点我查看曝光次数
                    </button>
                </div>
            )
        }
    }
    return <Demo />
    }
}
```

#### 元素渲染的时长

说明：统计该元素渲染到销毁的时长，在某些业务上可以认为是元素的停留时长，

统计发送的时机是该元素被销毁时发送，会在evtParams增加时间参数，单位为秒。

``` javascript
    {
        () => {
        class Demo2 extends React.Component {
            constructor(props) {
                super(props);
                this.state = {
                    show: true,
                };
            }
            render() {
                return (
                     <div>
                            {
                                this.state.show ? <Exposure 
                                    mode={['time']}
                                    digData={{
                                        evt: 200000,
                                        evtParams: {
                                            event: 'ItemExpo',
                                            uicode: '元素UIcode',
                                        },
                                        actionParams: {
                                            special: '时长埋点，注意观察在action参数中的stt,单位是秒'
                                        }
                                    }}
                                >
                                    此处放入将被曝光的元素
                                </Exposure>
                                : '注意观察控制台的evt参数'
                            }
                        <button onClick={() => {
                            this.setState({show: !this.state.show})}
                        }>
                            点我查看曝光时长
                        </button>
                    </div>
                )
            }
        }
        return <Demo2 />
        }
    }
```


#### 元素进入视区后到销毁的时长

说明：统计该元素从可视状态后到销毁的时长，统计发送的时机是该元素被销毁时发送，会在evtParams增加时间参数，单位为秒。

``` javascript
    {
        () => {
        class Demo3 extends React.Component {
            constructor(props) {
                super(props);
                this.state = {
                    show: true,
                };
            }
            render() {
                return (
                     <div>
                            {
                                this.state.show ? <Exposure 
                                    mode={['timeSinceView']}
                                    digData={{
                                        evtParams: {
                                            event: 'ItemExpo',
                                            uicode: '元素UIcode',
                                        },
                                        actionParams: {
                                            special: '可视区时长埋点，注意观察在action参数中的stt,单位是秒'
                                        }
                                    }}
                                >
                                    此处放入将被曝光的元素
                                </Exposure>
                                : '注意观察控制台的evt参数'
                            }
                        <button onClick={() => {
                            this.setState({show: !this.state.show})}
                        }>
                            点我查看曝光时长
                        </button>
                    </div>
                )
            }
        }
        return <Demo3 />
        }
    }
```


#### 混合使用

说明：统计元素曝光 + 该元素渲染到销毁的时长

``` javascript
    {
        () => {
        class Demo3 extends React.Component {
            constructor(props) {
                super(props);
                this.state = {
                    show: true,
                };
            }
            render() {
                return (
                     <div>
                            {
                                this.state.show ? <Exposure 
                                    mode={['time','normal']}
                                    digData={{
                                        evt: 200000,
                                        evtParams: {
                                            event: 'ItemExpo',
                                            uicode: '元素UIcode',
                                        },
                                        actionParams: {
                                            special: '曝光+时长混合使用埋点，注意观察控制台'
                                        }
                                    }}
                                >
                                    此处放入将被曝光的元素
                                </Exposure>
                                : '注意观察控制台的evt参数'
                            }
                        <button onClick={() => {
                            this.setState({show: !this.state.show})}
                        }>
                            点我查看曝光时长
                        </button>
                    </div>
                )
            }
        }
        return <Demo3 />
        }
    }
```

### 其他

## API

参数 | 说明 | 类型 | 是否必填 | 默认值
-|-|-|-|-
children | 渲染内容 | React.element ｜ string | 是 | 无
style | 外层容器样式 | object | 否 | display: inline-block
canDigSend | 控制是否可以发送埋点的标识 | boolean | 否 | true // 默认可发送，注意：当该状态改变时，需要重新绘制埋点组件
mode | 控制埋点的发送的时机 | array且为[ 'normal','view','viewonce','time','timeSinceView' ]其中之一 | 否 | 默认 ['noraml'] 即渲染曝光
digData | 埋点发送参数 | object | 是 | 请参考demo例子

