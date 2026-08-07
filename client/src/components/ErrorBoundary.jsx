import { Component } from 'react';

/**
 * 全局错误边界：捕获子组件渲染错误，防止单个页面崩溃导致整站白屏。
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-red-700">页面出错了</h2>
          <p className="mb-4 text-sm text-red-600">{this.state.error?.message || '发生未知错误'}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
