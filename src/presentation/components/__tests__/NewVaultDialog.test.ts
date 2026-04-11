import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NewVaultDialog from '../NewVaultDialog.vue'

describe('NewVaultDialog', () => {
  beforeEach(() => {
    ;(window as any).electronAPI = {
      vault: {
        getVaultsPath: vi.fn().mockResolvedValue('/tmp/mdnote/vaults'),
      },
    }
  })

  afterEach(() => {
    delete (window as any).electronAPI
  })

  it('loads the vault path and emits a trimmed create payload', async () => {
    const wrapper = mount(NewVaultDialog)

    await flushPromises()

    expect(wrapper.text()).toContain('/tmp/mdnote/vaults')

    const createButton = wrapper.get('[data-testid="confirm-create-vault"]')
    expect((createButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('[data-testid="new-vault-name-input"]').setValue('  自动化验收用知识库  ')

    expect((createButton.element as HTMLButtonElement).disabled).toBe(false)

    await createButton.trigger('click')

    expect(wrapper.emitted('create')).toEqual([[{ name: '自动化验收用知识库' }]])
  })

  it('emits close when cancel is clicked', async () => {
    const wrapper = mount(NewVaultDialog)

    await wrapper.get('[data-testid="cancel-create-vault"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
