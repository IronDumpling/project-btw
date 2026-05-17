import { useFocusEffect, useRouter } from "expo-router";
import { Plus, Trash2, UserRound, UsersRound } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mobileApi } from "@/api/client";
import type { Contact } from "@/api/types";
import { Card } from "@/components/Card";
import { IconBadge } from "@/components/DesignSystem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

type ContactDraft = {
  displayName: string;
  aliases: string;
  relationshipType: string;
  notes: string;
};

const emptyDraft: ContactDraft = { displayName: "", aliases: "", relationshipType: "", notes: "" };

export default function ContactsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const contacts = useAppStore((state) => state.contacts);
  const setContacts = useAppStore((state) => state.setContacts);
  const addContact = useAppStore((state) => state.addContact);
  const removeContact = useAppStore((state) => state.removeContact);
  const [draft, setDraft] = useState<ContactDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await mobileApi.listContacts();
      setContacts(result.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setLoading(false);
    }
  }, [setContacts, t]);

  useFocusEffect(useCallback(() => {
    void loadContacts();
  }, [loadContacts]));

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setDraft({
      displayName: contact.displayName,
      aliases: contact.aliases.join(", "),
      relationshipType: contact.relationshipType,
      notes: contact.notes
    });
  }

  async function saveContact() {
    if (!draft.displayName.trim()) {
      return;
    }
    setLoading(true);
    setError("");
    const payload = {
      displayName: draft.displayName.trim(),
      aliases: draft.aliases.split(",").map((item) => item.trim()).filter(Boolean),
      relationshipType: draft.relationshipType.trim(),
      notes: draft.notes.trim()
    };
    try {
      const contact = editingId
        ? await mobileApi.updateContact(editingId, payload)
        : await mobileApi.createContact(payload);
      addContact(contact);
      setEditingId(null);
      setDraft(emptyDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteContact(contactId: string) {
    setLoading(true);
    setError("");
    try {
      await mobileApi.deleteContact(contactId);
      removeContact(contactId);
      if (editingId === contactId) {
        setEditingId(null);
        setDraft(emptyDraft);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <Screen kicker={t("homeMenuContactsBody")} title={t("contactsTitle")} trailing={<IconBadge icon={UsersRound} />}>
        <Card>
          <View style={styles.cardHeader}>
            <IconBadge icon={editingId ? UserRound : Plus} tone="accent" />
            <Text style={styles.cardTitle}>{editingId ? t("contactsSave") : t("contactsAdd")}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t("profileDisplayName")}</Text>
            <TextInput placeholderTextColor={colors.muted} style={styles.input} value={draft.displayName} onChangeText={(displayName) => setDraft((current) => ({ ...current, displayName }))} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t("contactsAliases")}</Text>
            <TextInput placeholder={t("contactsAliasesPlaceholder")} placeholderTextColor={colors.muted} style={styles.input} value={draft.aliases} onChangeText={(aliases) => setDraft((current) => ({ ...current, aliases }))} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t("contactsRelationshipType")}</Text>
            <TextInput placeholderTextColor={colors.muted} style={styles.input} value={draft.relationshipType} onChangeText={(relationshipType) => setDraft((current) => ({ ...current, relationshipType }))} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t("contactsNotes")}</Text>
            <TextInput multiline placeholderTextColor={colors.muted} style={styles.textArea} value={draft.notes} onChangeText={(notes) => setDraft((current) => ({ ...current, notes }))} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton disabled={loading || !draft.displayName.trim()} label={loading ? t("commonLoading") : t("contactsSave")} onPress={saveContact} />
        </Card>

        {contacts.length === 0 ? (
          <Card>
            <Text style={styles.cardTitle}>{t("contactsEmptyTitle")}</Text>
            <Text style={styles.body}>{t("contactsEmptyBody")}</Text>
            <PrimaryButton label={t("homeImport")} onPress={() => router.push("/import")} />
          </Card>
        ) : (
          contacts.map((contact) => (
            <Card key={contact.id}>
              <View style={styles.contactRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{contact.displayName.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.contactCopy}>
                  <Text style={styles.cardTitle}>{contact.displayName}</Text>
                  {contact.relationshipType ? <Text style={styles.body}>{contact.relationshipType}</Text> : null}
                </View>
                <View style={styles.memoryPill}>
                  <Text style={styles.memoryPillText}>{contact.localMemorySummary ? t("memoryReviewTitle") : t("contactsNoMemory")}</Text>
                </View>
              </View>
              {contact.aliases.length ? <Text style={styles.body}>{contact.aliases.join(", ")}</Text> : null}
              {contact.notes ? <Text style={styles.body}>{contact.notes}</Text> : null}
              <Text style={styles.memorySummary}>{contact.localMemorySummary || t("contactsNoMemory")}</Text>
              <View style={styles.actions}>
                <PrimaryButton label={t("profileEdit")} variant="secondary" onPress={() => startEdit(contact)} />
                <Pressable disabled={loading} style={styles.deleteAction} onPress={() => deleteContact(contact.id)}>
                  <Trash2 color={colors.danger} size={18} />
                  <Text style={styles.deleteText}>{t("contactsDelete")}</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </Screen>
    </RequireAuth>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  field: {
    gap: spacing.xs
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  input: {
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 44,
    padding: spacing.sm
  },
  textArea: {
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 90,
    padding: spacing.sm,
    textAlignVertical: "top"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  contactRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  avatarText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "900"
  },
  contactCopy: {
    flex: 1,
    gap: 2
  },
  memoryPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  memoryPillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900"
  },
  memorySummary: {
    backgroundColor: colors.canvas,
    borderRadius: 14,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.sm
  },
  deleteAction: {
    alignItems: "center",
    backgroundColor: colors.coralSoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  deleteText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "900"
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});
