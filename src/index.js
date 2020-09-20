/*
 * @LastEditors: dcison
 * @LastEditTime: 2020-09-20 17:00:39
 * @Description: 元素埋点
 */
import React from 'react';
import PropTypes from 'prop-types';
import 'intersection-observer'; // IntersectionObserver 的 polyfill

const propTypes = {
    mode: PropTypes.arrayOf(PropTypes.oneOf(['normal', 'viewonce', 'view', 'time', 'timeSinceView'])),
    digData: PropTypes.objectOf(PropTypes.any).isRequired,
    style: PropTypes.objectOf(PropTypes.any),
    children: PropTypes.element.isRequired,
    canDigSend: PropTypes.bool, // 用于标识是否能发送埋点
};

const defaultProps = {
    style: {},
    canDigSend: true,
    mode: ['normal'],
};

const symbol = Symbol('sendFunction');

class Exposure extends React.Component {
    constructor(props) {
        super(props);
        const { mode, digData } = this.props;
        this.state = {
            digData: digData || {}, // 埋点参数数据
            hadSendOnceViewDig: false, // 用于标识曝光一次的可视区域元素 是否已经完成曝光
            elementHasInView: false, // 用于标识 多次进入可视区域元素 是否已经处于可视区域中 避免重复计算
            inViewTimes: 0, // 用于标识 多次进入可视区域元素的次数
            renderTime: 0, // 统计该元素的曝光时长
            observerOnce: null, // 在可视区域内出现一次即曝光
            observerMultiply: null, // 每在可视区域内出现一次就曝光一次
            observerTime: null, // 在可视区域出现的对象
            sendStayTime: false, // 是否需要发送元素的渲染的时间，即元素的出现时间
            elementEntryViewTime: 0, // 元素进入到视窗的时间
            mode: (Array.isArray(mode) && mode.length > 0) ? mode : ['normal'],
        };
        this.customEvents = this.customEvents();
    }

    componentWillMount() {
        this.setState({
            renderTime: new Date().getTime(),
        });
    }

    componentDidMount() {
        if (this.customEvents.getFuncParameters() === 0) {
            console.warn('请注意，您未传入埋点发送函数，函数发送功能将不可用');
            return;
        }
        const { mode, digData } = this.state;
        const {
            sendViewDigOnce, sendViewDigMultiply, setViewTime,
        } = this.customEvents;
        const options = {
            rootMargin: '0px',
            threshold: 1.0,
        };
        mode.forEach((type) => {
            switch (type) {
                case 'timeSinceView':
                { // 元素进入到视窗后才进行计时
                    const observerTime = new IntersectionObserver(setViewTime, options);
                    observerTime.observe(this.digWrap);
                    this.setState({
                        observerTime,
                    });
                    break;
                }
                case 'time': // 该元素的停留时间
                    if (!mode.includes('timeSinceView')) { // 如果没有从视窗计时模式，才走渲染计时逻辑
                        this.setState({
                            sendStayTime: true,
                        });
                    }
                    break;
                case 'viewonce':
                    if (!mode.includes('view')) { // 如果没有多次曝光，才走单次的可视曝光逻辑
                        const observerOnce = new IntersectionObserver(sendViewDigOnce, options);
                        observerOnce.observe(this.digWrap);
                        this.setState({
                            observerOnce,
                        });
                    }
                    break;
                case 'view':
                {
                    const observerMultiply = new IntersectionObserver(sendViewDigMultiply, options);
                    observerMultiply.observe(this.digWrap);
                    this.setState({
                        observerMultiply,
                    });
                    break;
                }
                default:
                    !!this.props.canDigSend && window[symbol](digData.evt, digData.evtParams, digData.actionParams);
            }
        });
    }


    componentWillUnmount() {
        // 如果有定义相应的监视函数 组件销毁时关闭对应的观察器
        const {
            observerOnce, observerMultiply, sendStayTime, digData,
            inViewTimes, mode, elementEntryViewTime, renderTime, observerTime,
        } = this.state;

        if (!!this.props.canDigSend && sendStayTime) { // 如果需要停留时长
            // eslint-disable-next-line no-bitwise
            const durationTime = ~~((new Date().getTime() - renderTime) / 1000); // 转换单位为秒
            window[symbol](
                digData.evt || '2', // 时间埋点 eventID 定义是 2 支持用户修改
                {
                    uicode: digData.evtParams.uicode,
                    stt: durationTime, // 停留时长
                },
                digData.actionParams
            );
        }
        if (!!this.props.canDigSend && mode.includes('view')) {
            // 发送 多次进入可视区域内的埋点
            window[symbol](digData.evt, digData.evtParams, { ...digData.actionParams, times: inViewTimes });
        }
        if (!!this.props.canDigSend && mode.includes('timeSinceView')) {
            // eslint-disable-next-line no-bitwise
            const durationTime = ~~((new Date().getTime() - elementEntryViewTime) / 1000); // 转换单位为秒
            window[symbol](
                digData.evt || '2', //  时间埋点 eventID 定义是 2 支持用户修改
                {
                    uicode: digData.evtParams.uicode,
                    stt: durationTime, // 停留时长
                },
                digData.actionParams
            );
        }

        observerOnce && observerOnce.disconnect();
        observerMultiply && observerMultiply.disconnect();
        observerTime && observerTime.disconnect();
    }

    customEvents() {
        return {
            sendViewDigOnce: (entries) => {
                entries.forEach((ele) => {
                    // 如果元素可见 发送一次埋点
                    if (ele.isIntersecting && !this.state.hadSendOnceViewDig) {
                        // 发送埋点
                        const { digData } = this.state;
                        !!this.props.canDigSend && window[symbol](
                            digData.evt, digData.evtParams, digData.actionParams
                        );
                        this.setState({
                            hadSendOnceViewDig: true,
                        });
                    }
                });
            },
            sendViewDigMultiply: (entries) => {
                const { inViewTimes } = this.state;
                entries.forEach((ele) => {
                    // 如果元素可见 进入可视区域的次数++
                    if (ele.isIntersecting && !this.state.elementHasInView) {
                        this.setState({
                            elementHasInView: true,
                            inViewTimes: inViewTimes + 1,
                        });
                    }
                    // 如果元素不可见 清除正在区域的标识
                    if (!ele.isIntersecting && this.state.elementHasInView) {
                        this.setState({
                            elementHasInView: false,
                        });
                    }
                });
            },
            setViewTime: (entries) => {
                // 如果元素可见 发送一次埋点
                entries.forEach((ele) => {
                    // 如果元素可见 发送一次埋点
                    if (ele.isIntersecting && this.state.elementEntryViewTime === 0) {
                        // 设置时间
                        this.setState({
                            elementEntryViewTime: new Date().getTime(),
                        });
                    }
                });
            },
            getFuncParameters: () => {
                if (typeof window !== 'object') {
                    // 兼容服务端渲染模式报错问题
                    return 0;
                }
                const mathes = /[^(]+\(([^)]*)?\)/gm.exec(Function.prototype.toString.call(window[symbol]));
                if (mathes[1]) {
                    const args = mathes[1].replace(/[^,\w]*/g, '').split(',');
                    return args.length;
                }
                return 0; // 返回 0 默认不执行
            },
        };
    }


    render() {
        const { style } = this.props;

        return (
            <div
                style={{
                    display: 'inline-block',
                    ...style,
                }}
                ref={(node) => { this.digWrap = node; }}
            >
                {this.props.children}
            </div>
        );
    }
}

Exposure.propTypes = propTypes;
Exposure.defaultProps = defaultProps;
export default Exposure;

export function initDig(send = () => {}) {
    // 兼容服务端渲染模式下 window 变量不存在情况
    if (typeof window === 'object') {
        // 在全局注册发送埋点函数
        if (typeof window[symbol] != 'function') {
            window[symbol] = send;
        }
    }
}
