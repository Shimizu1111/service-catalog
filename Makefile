PROJECT = service-catalog

.PHONY: dev deploy secrets

# ローカル開発サーバー起動
dev:
	npx wrangler pages dev public

# 本番デプロイ（secrets設定 → push）
deploy: secrets
	git push origin main

# .dev.vars の値を本番の環境変数に反映
secrets:
	@test -f .dev.vars || (echo ".dev.vars が見つかりません"; exit 1)
	@grep -v '^\s*#' .dev.vars | grep -v '^\s*$$' | while IFS='=' read -r key value; do \
		echo "Setting $$key..."; \
		echo "$$value" | npx wrangler pages secret put "$$key" --project-name $(PROJECT); \
	done
