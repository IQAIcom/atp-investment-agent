const { defineConfig } = require('vitest/config')

module.exports = defineConfig({
    test: {
        globals: true,
        include: ['**/*.test.ts'],
        exclude: ['node_modules'],
        coverage: {
            provider: 'istanbul',
        },
    },
})
