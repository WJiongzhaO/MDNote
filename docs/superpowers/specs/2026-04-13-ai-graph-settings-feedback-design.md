# AI Graph Settings Feedback and UI Polish Design

## Summary

This design improves the existing AI graph provider settings panel inside the knowledge graph modal. The scope is intentionally small: add clear connection/save feedback, field-level error guidance, loading states, and light visual cleanup without introducing a new page, route, or large-scale redesign.

The work stays inside the existing user path:

- Open a document
- Click the editor toolbar knowledge graph entry
- Switch to the `模型设置` tab in the AI knowledge graph modal

## Problem

The current `AiGraphProviderSettings` component is functionally wired but too minimal for real use:

- `测试连接` has no visible success feedback
- failed connection attempts do not clearly tell the user what happened
- there is no field-level guidance when input is incomplete or obviously invalid
- buttons do not communicate in-progress state
- the form layout is visually bare and harder to scan than nearby product surfaces

This creates a dead-end feeling: the user can click actions, but cannot confidently tell whether their configuration is valid or saved.

## Goals

1. Show explicit feedback after `测试连接` and `保存设置`.
2. Make success lightweight and non-blocking.
3. Make failure obvious and actionable through a top error banner plus field-level errors where possible.
4. Add loading/disabled states to prevent duplicate actions.
5. Improve readability and hierarchy with a small visual polish only.

## Non-Goals

- no new route or standalone settings page
- no large card-based redesign
- no advanced settings sections or collapsible expert options
- no toast system or app-wide notification framework
- no change to the modal navigation model beyond the existing `图谱 / 模型设置` switch
- no automatic graph build after successful test or save

## Current Integration Context

- `src/presentation/components/MarkdownEditor.vue` owns the knowledge graph modal and already mounts `AiGraphProviderSettings` under the `模型设置` tab.
- `src/presentation/components/AiGraphProviderSettings.vue` currently renders a bare form with provider, API key, model, and base URL fields.
- `AiGraphSettingsService` already provides `load`, `save`, and `testConnection`.

The design therefore extends existing wiring rather than introducing new host components.

## Proposed UX

### Overall Structure

Keep `AiGraphProviderSettings.vue` as a single lightweight form component. Enhance it with four visual regions:

1. **Header block**
   - title: `模型设置`
   - helper copy explaining that these settings are used to build the AI knowledge graph for the current document

2. **Top feedback region**
   - success: lightweight green notice
   - failure: persistent red status banner

3. **Field group**
   - existing fields stay in place:
     - Provider
     - API Key
     - Model
     - Base URL
   - each field reserves space for a small inline error message

4. **Action row**
   - `测试连接` as secondary action
   - `保存设置` as primary action
   - both disabled during async work

### Feedback Rules

#### Success feedback

- `测试连接` success shows a green, lightweight top notice
- `保存设置` success also shows a green top notice
- success notice auto-dismisses after roughly 2.5 seconds
- success notice does not block interaction and does not require explicit dismissal

#### Failure feedback

- `测试连接` failure shows a red top status banner
- `保存设置` failure also shows a red top status banner
- if the failure can be mapped to a field, a field-level error message is also shown
- error banner remains visible until the next meaningful action or field edit clears it

### Field-Level Error Mapping

The component should maintain a lightweight local error map keyed by field:

- `provider`
- `apiKey`
- `model`
- `baseUrl`

Mapping rules:

- missing/invalid API key -> `apiKey`
- missing/invalid model -> `model`
- missing/invalid base URL -> `baseUrl`
- unsupported/invalid provider -> `provider`
- unclassified backend/network failure -> banner only, no guessed field error

If service-layer validation throws a clear message, the component should map it to the most relevant field using explicit string matching rules or a tiny local classifier. If the message is ambiguous, prefer banner-only feedback rather than showing a misleading field error.

### Async States

The component should manage five internal UI states:

1. `idle`
2. `testing`
3. `test_success`
4. `test_error`
5. `saving`

Behavior by state:

- `idle`
  - no banner by default
  - both buttons enabled

- `testing`
  - `测试连接` label becomes `测试连接中...`
  - both buttons disabled
  - previous feedback and field errors are cleared before the request starts

- `test_success`
  - green top notice, e.g. `连接测试成功`
  - no field errors shown
  - auto-dismiss timer starts

- `test_error`
  - red top banner, e.g. `连接测试失败，请检查配置后重试`
  - mapped field errors shown when available

- `saving`
  - `保存设置` label becomes `保存中...`
  - both buttons disabled
  - previous feedback and field errors are cleared before the request starts

## Error Clearing Rules

- before each `测试连接`, clear prior banner feedback and field errors
- before each `保存设置`, clear prior banner feedback and field errors
- when the user edits a field:
  - clear that field's inline error
  - clear any existing failure banner
- success notice should disappear automatically
- failure banner should persist until edit or next action

These rules avoid stale errors lingering after the user has already corrected input.

## Visual Polish Scope

This is intentionally a **small polish pass**, not a redesign.

Allowed changes:

- add form title and helper copy
- normalize label spacing and input heights
- improve vertical rhythm between fields
- unify input, select, and button borders/radii
- make primary vs secondary buttons visually distinct
- style success notice and error banner using existing success/error colors
- style inline error text as small helper text below fields

Not allowed in this scope:

- no new multi-column settings layout
- no settings dashboard/card shell
- no advanced settings accordion
- no additional configuration fields unless already required by current service contract

## Suggested Copy

### Header

- Title: `模型设置`
- Description: `配置用于 AI 知识图谱构建的服务商、模型和连接地址。` 

### Success notices

- `连接测试成功`
- `设置已保存`

### Error banner defaults

- `连接测试失败，请检查配置后重试`
- `保存失败，请检查配置后重试`

### Field-level defaults

- API Key: `请输入有效的 API Key`
- Model: `请输入模型名称`
- Base URL: `请输入有效的服务地址`
- Provider: `请选择可用的服务商`

Service-provided messages may override these when clearer.

## Component Responsibilities

### `AiGraphProviderSettings.vue`

Owns:

- rendering the refined form UI
- local async state for testing/saving
- top success/error feedback
- local field error map
- banner/error clearing when user edits fields

Does not own:

- modal navigation
- graph build lifecycle
- global notifications

### `MarkdownEditor.vue`

No new behavior required beyond the existing tab switch that mounts the settings component. This design should not move feedback into the modal header or add modal-level error management.

## Testing Strategy

### Unit tests for `AiGraphProviderSettings`

Add or extend tests to cover:

1. renders title, helper copy, fields, and action buttons
2. clicking `测试连接` enters loading state
3. successful connection test shows success notice
4. failed connection test shows error banner
5. field-mapped failure shows the corresponding inline error
6. clicking `保存设置` enters saving state
7. successful save shows success notice
8. editing a field clears that field's error and clears stale failure banner

### Integration smoke

Existing modal wiring tests can remain light. Only verify that the settings view still mounts from the knowledge graph modal path if an adjustment becomes necessary.

## Acceptance Criteria

- user can open `模型设置` from the existing AI knowledge graph modal path
- `测试连接` shows visible loading state while pending
- successful `测试连接` shows a green top notice
- failed `测试连接` shows a red top banner
- field-specific failures show inline field errors when classification is clear
- `保存设置` shows visible loading state while pending
- successful save shows a green top notice
- failed save shows a red top banner
- editing fields clears stale error feedback
- UI is more readable and polished without introducing a new layout pattern
- focused unit tests pass
- build passes

## Risks and Mitigations

### Risk: brittle error mapping

Service errors may not be strongly typed yet.

Mitigation:

- keep mapping conservative
- only map obvious messages to fields
- otherwise show banner-only feedback

### Risk: duplicated validation logic

The component could drift away from service validation rules.

Mitigation:

- use component-side validation only for minimal UI clarity
- continue treating the service as the source of truth

## Implementation Notes

- prefer incremental changes inside `AiGraphProviderSettings.vue`
- avoid introducing a new composable unless the state logic becomes genuinely noisy
- reuse existing theme variables where available for success/error colors and borders
- keep the DOM structure test-friendly with stable roles or `data-testid` only where necessary

