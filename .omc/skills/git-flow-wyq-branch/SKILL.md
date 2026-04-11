---
name: git-flow-wyq-branch
description: 在 MDNote 仓库执行 wyq 前缀分支提交流程，并规避本地 agent 目录误提交与 HTTPS 认证阻塞
triggers:
  - git push
  - wyq branch
  - branch naming
  - remote auth
argument-hint: "<feature-or-bugfix-name>"
---

# Git Flow Wyq Branch Skill

## Purpose

规范在 MDNote 仓库中创建 `wyq` 前缀分支、提交改动、推送远端的流程，并记录本仓库的高频坑点。

## When to Activate

- 需要把当前修改整理到新分支并推送远端
- 分支名要求以 `wyq` 为前缀，例如 `feature/wyq/...`、`bugfix/wyq/...`
- 需要排查为什么 `git push` 没走通

## Workflow

1. 先检查工作区：`git status --short --branch`、`git remote -v`
2. 只暂存业务相关文件，避免把 `.aiden/`、`.omc/` 这类本地 agent 目录一起提交
3. 按改动性质创建分支，例如：
   - 新增功能/测试增强：`feature/wyq/<name>`
   - 修复问题：`bugfix/wyq/<name>`
4. 提交前跑最轻量但有意义的验证（unit/e2e/build）
5. 执行 `git push -u origin <branch>`，若失败，优先验证认证/权限而不是猜环境

## Gotchas

- `.aiden/` 和 `.omc/` 是本地工具目录，默认不应提交；本仓库需要在 `.gitignore` 中显式忽略。
- 远端当前是 HTTPS：`https://github.com/WJiongzhaO/MDNote.git`
- 若执行 `GIT_TERMINAL_PROMPT=0 git push ...` 出现：
  `fatal: could not read Username for 'https://github.com': terminal prompts disabled`
  说明阻塞点是 GitHub 凭证未配置，不是分支名或代码内容问题。

## Example

```bash
git checkout -b feature/wyq/testid-e2e-stability
git add <tracked-files-only>
git commit -m "test: stabilize vault and fragment e2e coverage"
git push -u origin feature/wyq/testid-e2e-stability
```

## Notes

- 推送失败时，先用 `git remote show origin` 和无交互 push 验证认证问题。
- 如果团队统一改用 SSH，可将 remote 改成 `git@github.com:WJiongzhaO/MDNote.git` 后再推送。
