import { Component } from "react";

/* Renders nothing in place of a part of the auth stage that throws — a
   chunk or model that fails to download, a browser without WebGL. The
   stage is scenery: the form beside it has to keep working. */
export default class StageBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn(`[auth] ${this.props.what ?? "3D stage"} unavailable:`, error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
