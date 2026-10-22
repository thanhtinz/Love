import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../components/ui";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.pink,
        tabBarInactiveTintColor: C.textFaint,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: C.pinkBorder, height: 60, paddingBottom: 6, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Trang chủ", tabBarIcon: ({ focused, size }) => <Ionicons name="home" size={size} color={focused ? C.pink : C.textFaint} /> }} />
      <Tabs.Screen name="garden" options={{ title: "Vườn", tabBarIcon: ({ focused, size }) => <Ionicons name="leaf" size={size} color={focused ? C.pink : C.textFaint} /> }} />
      <Tabs.Screen name="letters" options={{ title: "Thư", tabBarIcon: ({ focused, size }) => <Ionicons name="mail" size={size} color={focused ? C.pink : C.textFaint} /> }} />
      <Tabs.Screen name="games" options={{ title: "Trò chơi", tabBarIcon: ({ focused, size }) => <Ionicons name="game-controller" size={size} color={focused ? C.pink : C.textFaint} /> }} />
      <Tabs.Screen name="utilities" options={{ title: "Tiện ích", tabBarIcon: ({ focused, size }) => <Ionicons name="heart-circle" size={size} color={focused ? C.pink : C.textFaint} /> }} />
      <Tabs.Screen name="account" options={{ title: "Tài khoản", tabBarIcon: ({ focused, size }) => <Ionicons name="person-circle" size={size} color={focused ? C.pink : C.textFaint} /> }} />
    </Tabs>
  );
}
