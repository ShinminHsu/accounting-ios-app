## ADDED Requirements

### Requirement: Keyboard-aware modal pattern

All modals that contain text input fields SHALL use the following structure:
```
<Modal>
  <SafeAreaView>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* form content */}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
</Modal>
```
No text-input modal SHALL allow the system keyboard to obscure any form field.

Affected modals: CreateAccountModal, ExchangeRateModal, CreateRewardRuleModal, CreateRecurringModal, EditRecurringModal.

#### Scenario: Keyboard does not obscure last field in modal

- **WHEN** the user taps the last input field in any modal form
- **THEN** the keyboard SHALL appear and the tapped field SHALL be fully visible above the keyboard

---

### Requirement: Full-screen push navigation pattern for settings-style screens

Settings-style screens navigated from the More tab SHALL use Stack navigation with `presentation: 'card'` (full-screen slide-in from right). The modal `presentationStyle: 'pageSheet'` pattern SHALL NOT be used for these screens. Applicable screens: AccountsScreen, CategorySettingsScreen, DebtTrackingScreen (借還款追蹤), CreditCardDetailScreen, ReconciliationScreen, RecurringTemplatesScreen.

#### Scenario: Settings screen slides in full-screen

- **WHEN** the user taps any item in the More tab menu
- **THEN** the destination screen SHALL animate in from the right edge, covering the full screen with a navigation back button in the top-left

#### Scenario: Bottom sheet NOT used for More tab children

- **WHEN** the user taps "分類管理" in the More tab
- **THEN** the CategorySettingsScreen SHALL NOT appear as a bottom sheet or partial-height modal; it SHALL occupy the full screen
