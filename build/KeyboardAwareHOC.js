function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import React from 'react';
import PropTypes from 'prop-types';
import { Keyboard, Platform, UIManager, TextInput, findNodeHandle, Animated } from 'react-native';
import { isIphoneX } from 'react-native-iphone-x-helper';

const _KAM_DEFAULT_TAB_BAR_HEIGHT = isIphoneX() ? 83 : 49;

const _KAM_KEYBOARD_OPENING_TIME = 250;
const _KAM_EXTRA_HEIGHT = 75;
const supportedKeyboardEvents = ['keyboardWillShow', 'keyboardDidShow', 'keyboardWillHide', 'keyboardDidHide', 'keyboardWillChangeFrame', 'keyboardDidChangeFrame'];

const keyboardEventToCallbackName = eventName => 'on' + eventName[0].toUpperCase() + eventName.substring(1);

const keyboardEventPropTypes = supportedKeyboardEvents.reduce((acc, eventName) => ({ ...acc,
  [keyboardEventToCallbackName(eventName)]: PropTypes.func
}), {});
const keyboardAwareHOCTypeEvents = supportedKeyboardEvents.reduce((acc, eventName) => ({ ...acc,
  [keyboardEventToCallbackName(eventName)]: Function
}), {});

function getDisplayName(WrappedComponent) {
  return WrappedComponent && (WrappedComponent.displayName || WrappedComponent.name) || 'Component';
}

const ScrollIntoViewDefaultOptions = {
  enableOnAndroid: false,
  contentContainerStyle: undefined,
  enableAutomaticScroll: true,
  extraHeight: _KAM_EXTRA_HEIGHT,
  extraScrollHeight: 0,
  enableResetScrollToCoords: true,
  keyboardOpeningTime: _KAM_KEYBOARD_OPENING_TIME,
  viewIsInsideTabBar: false,
  // The ref prop name that will be passed to the wrapped component to obtain a ref
  // If your ScrollView is already wrapped, maybe the wrapper permit to get a ref
  // For example, with glamorous-native ScrollView, you should use "innerRef"
  refPropName: 'ref',
  // Sometimes the ref you get is a ref to a wrapped view (ex: Animated.ScrollView)
  // We need access to the imperative API of a real native ScrollView so we need extraction logic
  extractNativeRef: ref => {
    // getNode() permit to support Animated.ScrollView automatically
    // see https://github.com/facebook/react-native/issues/19650
    // see https://stackoverflow.com/questions/42051368/scrollto-is-undefined-on-animated-scrollview/48786374
    if (ref.getNode) {
      return ref.getNode();
    } else {
      return ref;
    }
  }
};

function KeyboardAwareHOC(ScrollableComponent, userOptions = {}) {
  var _class, _temp;

  const hocOptions = { ...ScrollIntoViewDefaultOptions,
    ...userOptions
  };
  return _temp = _class = class extends React.Component {
    constructor(props) {
      super(props);

      _defineProperty(this, "_rnkasv_keyboardView", void 0);

      _defineProperty(this, "keyboardWillShowEvent", void 0);

      _defineProperty(this, "keyboardWillHideEvent", void 0);

      _defineProperty(this, "position", void 0);

      _defineProperty(this, "defaultResetScrollToCoords", void 0);

      _defineProperty(this, "mountedComponent", void 0);

      _defineProperty(this, "handleOnScroll", void 0);

      _defineProperty(this, "state", void 0);

      _defineProperty(this, "getScrollResponder", () => {
        return this._rnkasv_keyboardView && this._rnkasv_keyboardView.getScrollResponder && this._rnkasv_keyboardView.getScrollResponder();
      });

      _defineProperty(this, "scrollToPosition", (x, y, animated = true) => {
        const responder = this.getScrollResponder();
        responder && responder.scrollResponderScrollTo({
          x,
          y,
          animated
        });
      });

      _defineProperty(this, "scrollToEnd", (animated = true) => {
        const responder = this.getScrollResponder();
        responder && responder.scrollResponderScrollToEnd({
          animated
        });
      });

      _defineProperty(this, "scrollForExtraHeightOnAndroid", extraHeight => {
        this.scrollToPosition(0, this.position.y + extraHeight, true);
      });

      _defineProperty(this, "scrollToFocusedInput", (reactNode, extraHeight, keyboardOpeningTime) => {
        if (extraHeight === undefined) {
          extraHeight = this.props.extraHeight || 0;
        }

        if (keyboardOpeningTime === undefined) {
          keyboardOpeningTime = this.props.keyboardOpeningTime || 0;
        }

        setTimeout(() => {
          if (!this.mountedComponent) {
            return;
          }

          const responder = this.getScrollResponder();
          responder && responder.scrollResponderScrollNativeHandleToKeyboard(reactNode, extraHeight, true);
        }, keyboardOpeningTime);
      });

      _defineProperty(this, "scrollIntoView", async (element, options = {}) => {
        if (!this._rnkasv_keyboardView || !element) {
          return;
        }

        const [parentLayout, childLayout] = await Promise.all([this._measureElement(this._rnkasv_keyboardView), this._measureElement(element)]);
        const getScrollPosition = options.getScrollPosition || this._defaultGetScrollPosition;
        const {
          x,
          y,
          animated
        } = getScrollPosition(parentLayout, childLayout, this.position);
        this.scrollToPosition(x, y, animated);
      });

      _defineProperty(this, "_defaultGetScrollPosition", (parentLayout, childLayout, contentOffset) => {
        return {
          x: 0,
          y: Math.max(0, childLayout.y - parentLayout.y + contentOffset.y),
          animated: true
        };
      });

      _defineProperty(this, "_measureElement", element => {
        const node = findNodeHandle(element);
        return new Promise(resolve => {
          UIManager.measureInWindow(node, (x, y, width, height) => {
            resolve({
              x,
              y,
              width,
              height
            });
          });
        });
      });

      _defineProperty(this, "_updateKeyboardSpace", frames => {
        // Automatically scroll to focused TextInput
        if (this.props.enableAutomaticScroll) {
          let keyboardSpace = frames.endCoordinates.height + this.props.extraScrollHeight;

          if (this.props.viewIsInsideTabBar) {
            keyboardSpace -= _KAM_DEFAULT_TAB_BAR_HEIGHT;
          }

          this.setState({
            keyboardSpace
          });
          const currentlyFocusedField = TextInput.State.currentlyFocusedField();
          const responder = this.getScrollResponder();

          if (!currentlyFocusedField || !responder) {
            return;
          }

          UIManager.viewIsDescendantOf(currentlyFocusedField, responder.getInnerViewNode(), isAncestor => {
            if (isAncestor) {
              // Check if the TextInput will be hidden by the keyboard
              UIManager.measureInWindow(currentlyFocusedField, (x, y, width, height) => {
                const textInputBottomPosition = y + height;
                const keyboardPosition = frames.endCoordinates.screenY;
                const totalExtraHeight = this.props.extraScrollHeight + this.props.extraHeight;

                if (Platform.OS === 'ios') {
                  if (textInputBottomPosition > keyboardPosition - totalExtraHeight) {
                    this._scrollToFocusedInputWithNodeHandle(currentlyFocusedField);
                  }
                } else {
                  // On android, the system would scroll the text input just
                  // above the keyboard so we just neet to scroll the extra
                  // height part
                  if (textInputBottomPosition > keyboardPosition) {
                    // Since the system already scrolled the whole view up
                    // we should reduce that amount
                    keyboardSpace = keyboardSpace - (textInputBottomPosition - keyboardPosition);
                    this.setState({
                      keyboardSpace
                    });
                    this.scrollForExtraHeightOnAndroid(totalExtraHeight);
                  } else if (textInputBottomPosition > keyboardPosition - totalExtraHeight) {
                    this.scrollForExtraHeightOnAndroid(totalExtraHeight - (keyboardPosition - textInputBottomPosition));
                  }
                }
              });
            }
          });
        }

        if (!this.props.resetScrollToCoords) {
          if (!this.defaultResetScrollToCoords) {
            this.defaultResetScrollToCoords = this.position;
          }
        }
      });

      _defineProperty(this, "_resetKeyboardSpace", () => {
        const keyboardSpace = this.props.viewIsInsideTabBar ? _KAM_DEFAULT_TAB_BAR_HEIGHT : 0;
        this.setState({
          keyboardSpace
        }); // Reset scroll position after keyboard dismissal

        if (this.props.enableResetScrollToCoords === false) {
          this.defaultResetScrollToCoords = null;
          return;
        } else if (this.props.resetScrollToCoords) {
          this.scrollToPosition(this.props.resetScrollToCoords.x, this.props.resetScrollToCoords.y, true);
        } else {
          if (this.defaultResetScrollToCoords) {
            this.scrollToPosition(this.defaultResetScrollToCoords.x, this.defaultResetScrollToCoords.y, true);
            this.defaultResetScrollToCoords = null;
          } else {
            this.scrollToPosition(0, 0, true);
          }
        }
      });

      _defineProperty(this, "_scrollToFocusedInputWithNodeHandle", (nodeID, extraHeight, keyboardOpeningTime) => {
        if (extraHeight === undefined) {
          extraHeight = this.props.extraHeight;
        }

        const reactNode = findNodeHandle(nodeID);
        this.scrollToFocusedInput(reactNode, extraHeight + this.props.extraScrollHeight, keyboardOpeningTime !== undefined ? keyboardOpeningTime : this.props.keyboardOpeningTime || 0);
      });

      _defineProperty(this, "_handleOnScroll", e => {
        this.position = e.nativeEvent.contentOffset;
      });

      _defineProperty(this, "_handleRef", ref => {
        this._rnkasv_keyboardView = ref ? hocOptions.extractNativeRef(ref) : ref;

        if (this.props.innerRef) {
          this.props.innerRef(this._rnkasv_keyboardView);
        }
      });

      _defineProperty(this, "update", () => {
        const currentlyFocusedField = TextInput.State.currentlyFocusedField();
        const responder = this.getScrollResponder();

        if (!currentlyFocusedField || !responder) {
          return;
        }

        this._scrollToFocusedInputWithNodeHandle(currentlyFocusedField);
      });

      this.keyboardWillShowEvent = undefined;
      this.keyboardWillHideEvent = undefined;
      this.callbacks = {};
      this.position = {
        x: 0,
        y: 0
      };
      this.defaultResetScrollToCoords = null;

      const _keyboardSpace = props.viewIsInsideTabBar ? _KAM_DEFAULT_TAB_BAR_HEIGHT : 0;

      this.state = {
        keyboardSpace: _keyboardSpace
      };
    }

    componentDidMount() {
      this.mountedComponent = true; // Keyboard events

      if (Platform.OS === 'ios') {
        this.keyboardWillShowEvent = Keyboard.addListener('keyboardWillShow', this._updateKeyboardSpace);
        this.keyboardWillHideEvent = Keyboard.addListener('keyboardWillHide', this._resetKeyboardSpace);
      } else if (Platform.OS === 'android' && this.props.enableOnAndroid) {
        this.keyboardWillShowEvent = Keyboard.addListener('keyboardDidShow', this._updateKeyboardSpace);
        this.keyboardWillHideEvent = Keyboard.addListener('keyboardDidHide', this._resetKeyboardSpace);
      }

      supportedKeyboardEvents.forEach(eventName => {
        const callbackName = keyboardEventToCallbackName(eventName);

        if (this.props[callbackName]) {
          this.callbacks[eventName] = Keyboard.addListener(eventName, this.props[callbackName]);
        }
      });
    }

    componentDidUpdate(prevProps) {
      if (this.props.viewIsInsideTabBar !== prevProps.viewIsInsideTabBar) {
        const keyboardSpace = this.props.viewIsInsideTabBar ? _KAM_DEFAULT_TAB_BAR_HEIGHT : 0;

        if (this.state.keyboardSpace !== keyboardSpace) {
          this.setState({
            keyboardSpace
          });
        }
      }
    }

    componentWillUnmount() {
      this.mountedComponent = false;
      this.keyboardWillShowEvent && this.keyboardWillShowEvent.remove();
      this.keyboardWillHideEvent && this.keyboardWillHideEvent.remove();
      Object.values(this.callbacks).forEach(callback => callback.remove());
    }

    render() {
      const {
        enableOnAndroid,
        contentContainerStyle,
        onScroll
      } = this.props;
      let newContentContainerStyle;

      if (Platform.OS === 'android' && enableOnAndroid) {
        newContentContainerStyle = [].concat(contentContainerStyle).concat({
          paddingBottom: ((contentContainerStyle || {}).paddingBottom || 0) + this.state.keyboardSpace
        });
      }

      const refProps = {
        [hocOptions.refPropName]: this._handleRef
      };
      return React.createElement(ScrollableComponent, _extends({}, refProps, {
        keyboardDismissMode: "interactive",
        contentInset: {
          bottom: this.state.keyboardSpace
        },
        automaticallyAdjustContentInsets: false,
        showsVerticalScrollIndicator: true,
        scrollEventThrottle: 1
      }, this.props, {
        contentContainerStyle: newContentContainerStyle || contentContainerStyle,
        keyboardSpace: this.state.keyboardSpace,
        getScrollResponder: this.getScrollResponder,
        scrollToPosition: this.scrollToPosition,
        scrollToEnd: this.scrollToEnd,
        scrollForExtraHeightOnAndroid: this.scrollForExtraHeightOnAndroid,
        scrollToFocusedInput: this.scrollToFocusedInput,
        scrollIntoView: this.scrollIntoView,
        resetKeyboardSpace: this._resetKeyboardSpace,
        handleOnScroll: this._handleOnScroll,
        update: this.update,
        onScroll: Animated.forkEvent(onScroll, this._handleOnScroll)
      }));
    }

  }, _defineProperty(_class, "displayName", `KeyboardAware${getDisplayName(ScrollableComponent)}`), _defineProperty(_class, "propTypes", {
    viewIsInsideTabBar: PropTypes.bool,
    resetScrollToCoords: PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    }),
    enableResetScrollToCoords: PropTypes.bool,
    enableAutomaticScroll: PropTypes.bool,
    extraHeight: PropTypes.number,
    extraScrollHeight: PropTypes.number,
    keyboardOpeningTime: PropTypes.number,
    onScroll: PropTypes.oneOfType([PropTypes.func, // Normal listener
    PropTypes.object // Animated.event listener
    ]),
    update: PropTypes.func,
    contentContainerStyle: PropTypes.any,
    enableOnAndroid: PropTypes.bool,
    innerRef: PropTypes.func,
    ...keyboardEventPropTypes
  }), _defineProperty(_class, "defaultProps", {
    enableAutomaticScroll: hocOptions.enableAutomaticScroll,
    extraHeight: hocOptions.extraHeight,
    extraScrollHeight: hocOptions.extraScrollHeight,
    enableResetScrollToCoords: hocOptions.enableResetScrollToCoords,
    keyboardOpeningTime: hocOptions.keyboardOpeningTime,
    viewIsInsideTabBar: hocOptions.viewIsInsideTabBar,
    enableOnAndroid: hocOptions.enableOnAndroid
  }), _temp;
} // Allow to pass options, without breaking change, and curried for composition
// listenToKeyboardEvents(ScrollView);
// listenToKeyboardEvents(options)(Comp);


const listenToKeyboardEvents = configOrComp => {
  if (typeof configOrComp === 'object') {
    return Comp => KeyboardAwareHOC(Comp, configOrComp);
  } else {
    return KeyboardAwareHOC(configOrComp);
  }
};

export default listenToKeyboardEvents;