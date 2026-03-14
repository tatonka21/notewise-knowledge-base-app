import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getModulesByCategory, layoutSchemes, moduleCategories, type ModuleDefinition } from "@/constants/module-catalog";
import { useColors } from "@/hooks/use-colors";

function iconForModule(module: ModuleDefinition): "doc.text.fill" | "folder.fill" | "sparkles" | "gearshape.fill" | "chevron.left.forwardslash.chevron.right" | "rectangle.split.3x1" | "tag.fill" {
  if (module.id <= 5) return "folder.fill";
  if (module.id <= 10) return "chevron.left.forwardslash.chevron.right";
  if (module.id <= 15) return "doc.text.fill";
  if (module.id <= 20) return "rectangle.split.3x1";
  if (module.id <= 25) return "sparkles";
  return "gearshape.fill";
}

export default function ModulesScreen() {
  const colors = useColors();
  const [selectedScheme, setSelectedScheme] = useState(layoutSchemes[0].id);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Product Layout Planner</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Pick a layout scheme, then we can apply it page-by-page.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Layout Schemes</Text>
          {layoutSchemes.map((scheme) => {
            const isSelected = selectedScheme === scheme.id;
            return (
              <Pressable
                key={scheme.id}
                onPress={() => setSelectedScheme(scheme.id)}
                style={[
                  styles.schemeCard,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <View style={styles.schemeHeader}>
                  <Text style={[styles.schemeName, { color: colors.foreground }]}>{scheme.name}</Text>
                  {isSelected && <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />}
                </View>
                <Text style={[styles.schemeSummary, { color: colors.muted }]}>{scheme.summary}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Module Blueprint (28)</Text>
          {moduleCategories.map((category) => {
            const modules = getModulesByCategory(category.id);
            return (
              <View key={category.id} style={styles.categoryBlock}>
                <Text style={[styles.categoryTitle, { color: colors.foreground }]}>{category.title}</Text>
                <Text style={[styles.categoryDescription, { color: colors.muted }]}>{category.description}</Text>
                {modules.map((module) => (
                  <View key={module.id} style={[styles.moduleCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <View style={styles.moduleHeader}>
                      <View style={[styles.moduleIcon, { backgroundColor: colors.primary + "22" }]}>
                        <IconSymbol name={iconForModule(module)} size={14} color={colors.primary} />
                      </View>
                      <Text style={[styles.moduleTitle, { color: colors.foreground }]}>
                        {module.id}. {module.title}
                      </Text>
                    </View>
                    <Text style={[styles.modulePurpose, { color: colors.muted }]}>{module.purpose}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 20,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  schemeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  schemeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  schemeName: {
    fontSize: 15,
    fontWeight: "700",
  },
  schemeSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  categoryBlock: {
    gap: 8,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  categoryDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 2,
  },
  moduleCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moduleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  modulePurpose: {
    fontSize: 12,
    lineHeight: 17,
  },
});
