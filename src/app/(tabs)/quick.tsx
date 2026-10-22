import React from "react";
import { Redirect } from "expo-router";

/**
 * Route giữ chỗ cho nút "+" ở giữa tab bar. Nút này có tabBarButton tuỳ biến
 * (chỉ mở sheet hành động nhanh, không điều hướng) nên màn hình này không bao
 * giờ được mở từ tab bar; nếu bị mở thẳng bằng deep link thì quay về Trang chủ.
 */
export default function QuickPlaceholderScreen() {
  return <Redirect href="/(tabs)" />;
}
