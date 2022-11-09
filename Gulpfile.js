import gulp from 'gulp'
import { deleteAsync } from 'del'
import coffee from 'gulp-coffee'
import uglifyES from 'gulp-uglify-es'
import webpack from 'webpack-stream'

const uglify = uglifyES.default

gulp.task('clean', async () => await deleteAsync(['dist/**/*']))

gulp.task('coffee',
  gulp.series('clean', () =>
    gulp.src('lib/**/*.coffee')
      .pipe(coffee({bare: true}))
      .pipe(uglify())
      .pipe(gulp.dest('dist'))
  )
)

// NOTE: DISABLE bower SINCE USING NPM
gulp.task('default', gulp.series('coffee'))

gulp.task('watch', () => gulp.watch(['lib/**/*.coffee'], gulp.series('default')))
