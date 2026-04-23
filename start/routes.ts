import router from '@adonisjs/core/services/router'

router.get('/', () => {
  return { status: false }
})

import '#routes/auth'
