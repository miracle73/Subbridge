import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { C, F, R, S } from "../utils/theme";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.msg}>An unexpected error occurred.</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: S.xl, backgroundColor: C.bg },
  title: { fontSize: F.h3, fontWeight: "800", color: C.text, marginBottom: S.sm },
  msg: { fontSize: F.md, color: C.textMuted, textAlign: "center", marginBottom: S.lg },
  btn: { backgroundColor: C.primary, paddingHorizontal: S.xl, paddingVertical: S.md, borderRadius: R.sm },
  btnText: { color: C.white, fontWeight: "700", fontSize: F.lg },
});
