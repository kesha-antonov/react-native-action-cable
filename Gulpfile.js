import gulp from 'gulp'
import { deleteAsync } from 'del'
import ts from 'gulp-typescript'
import uglifyES from 'gulp-uglify-es'
import webpack from 'webpack-stream'

const uglify = uglifyES.default

gulp.task('clean', async () => await deleteAsync(['dist/**/*']))

const tsProject = ts.createProject('tsconfig.json');

gulp.task('typescript',
  gulp.series('clean', () => {
    const tsResult = gulp.src('lib/**/*.ts')
      .pipe(tsProject());
    
    // Only uglify JS files, not declaration files
    return tsResult.js
      .pipe(uglify())
      .pipe(gulp.dest('dist'));
  })
)

// NOTE: DISABLE bower SINCE USING NPM
gulp.task('default', gulp.series('typescript'))

gulp.task('watch', () => gulp.watch(['lib/**/*.ts'], gulp.series('default')))
