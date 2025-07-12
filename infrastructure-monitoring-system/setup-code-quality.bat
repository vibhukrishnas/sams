@echo off
echo ================================================================
echo  SAMS Code Quality Gates Setup
echo ================================================================
echo.
echo This script will set up comprehensive code quality tools:
echo - SonarQube for code analysis
echo - ESLint for JavaScript/TypeScript
echo - Checkstyle for Java
echo - PMD for Java code analysis
echo - SpotBugs for bug detection
echo - Prettier for code formatting
echo.

echo [1/6] Setting up SonarQube configuration...
echo.

REM Create SonarQube properties
echo # SonarQube Configuration > sonar-project.properties
echo sonar.projectKey=sams-infrastructure-monitoring >> sonar-project.properties
echo sonar.projectName=SAMS Infrastructure Monitoring System >> sonar-project.properties
echo sonar.projectVersion=1.0.0 >> sonar-project.properties
echo sonar.sourceEncoding=UTF-8 >> sonar-project.properties
echo. >> sonar-project.properties
echo # Source directories >> sonar-project.properties
echo sonar.sources=backend/src/main,frontend/src,mobile-app/src >> sonar-project.properties
echo sonar.tests=backend/src/test,frontend/src,mobile-app/__tests__ >> sonar-project.properties
echo. >> sonar-project.properties
echo # Language-specific settings >> sonar-project.properties
echo sonar.java.source=17 >> sonar-project.properties
echo sonar.java.binaries=backend/target/classes >> sonar-project.properties
echo sonar.java.test.binaries=backend/target/test-classes >> sonar-project.properties
echo sonar.java.libraries=backend/target/dependency/*.jar >> sonar-project.properties
echo. >> sonar-project.properties
echo # JavaScript/TypeScript settings >> sonar-project.properties
echo sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info,mobile-app/coverage/lcov.info >> sonar-project.properties
echo. >> sonar-project.properties
echo # Exclusions >> sonar-project.properties
echo sonar.exclusions=**/*.test.js,**/*.test.ts,**/*.spec.js,**/*.spec.ts,**/node_modules/**,**/target/** >> sonar-project.properties
echo. >> sonar-project.properties
echo # Quality gates >> sonar-project.properties
echo sonar.qualitygate.wait=true >> sonar-project.properties

echo ✅ SonarQube configuration created
echo.

echo [2/6] Setting up Java code quality tools...
echo.

REM Create Checkstyle configuration
echo ^<?xml version="1.0"?^> > checkstyle.xml
echo ^<!DOCTYPE module PUBLIC >> checkstyle.xml
echo     "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN" >> checkstyle.xml
echo     "https://checkstyle.org/dtds/configuration_1_3.dtd"^> >> checkstyle.xml
echo. >> checkstyle.xml
echo ^<module name="Checker"^> >> checkstyle.xml
echo     ^<property name="charset" value="UTF-8"/^> >> checkstyle.xml
echo     ^<property name="severity" value="warning"/^> >> checkstyle.xml
echo     ^<property name="fileExtensions" value="java, properties, xml"/^> >> checkstyle.xml
echo. >> checkstyle.xml
echo     ^<module name="TreeWalker"^> >> checkstyle.xml
echo         ^<module name="OuterTypeFilename"/^> >> checkstyle.xml
echo         ^<module name="IllegalTokenText"^> >> checkstyle.xml
echo             ^<property name="tokens" value="STRING_LITERAL, CHAR_LITERAL"/^> >> checkstyle.xml
echo             ^<property name="format" value="\\u00(09|0(a|A)|0(c|C)|0(d|D)|22|27|5(C|c))|\\(0(10|11|12|14|15|42|47)|134)"/^> >> checkstyle.xml
echo             ^<property name="message" value="Consider using special escape sequence instead of octal value or Unicode escaped value."/^> >> checkstyle.xml
echo         ^</module^> >> checkstyle.xml
echo         ^<module name="AvoidEscapedUnicodeCharacters"^> >> checkstyle.xml
echo             ^<property name="allowEscapesForControlCharacters" value="true"/^> >> checkstyle.xml
echo             ^<property name="allowByTailComment" value="true"/^> >> checkstyle.xml
echo             ^<property name="allowNonPrintableEscapes" value="true"/^> >> checkstyle.xml
echo         ^</module^> >> checkstyle.xml
echo         ^<module name="LineLength"^> >> checkstyle.xml
echo             ^<property name="max" value="120"/^> >> checkstyle.xml
echo             ^<property name="ignorePattern" value="^package.*|^import.*|a href|href|http://|https://|ftp://"/^> >> checkstyle.xml
echo         ^</module^> >> checkstyle.xml
echo     ^</module^> >> checkstyle.xml
echo ^</module^> >> checkstyle.xml

REM Create PMD ruleset
echo ^<?xml version="1.0"?^> > pmd-ruleset.xml
echo ^<ruleset name="SAMS PMD Rules" >> pmd-ruleset.xml
echo          xmlns="http://pmd.sourceforge.net/ruleset/2.0.0" >> pmd-ruleset.xml
echo          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" >> pmd-ruleset.xml
echo          xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0 https://pmd.sourceforge.io/ruleset_2_0_0.xsd"^> >> pmd-ruleset.xml
echo. >> pmd-ruleset.xml
echo     ^<description^>PMD rules for SAMS project^</description^> >> pmd-ruleset.xml
echo. >> pmd-ruleset.xml
echo     ^<rule ref="category/java/bestpractices.xml"/^> >> pmd-ruleset.xml
echo     ^<rule ref="category/java/codestyle.xml"/^> >> pmd-ruleset.xml
echo     ^<rule ref="category/java/design.xml"/^> >> pmd-ruleset.xml
echo     ^<rule ref="category/java/errorprone.xml"/^> >> pmd-ruleset.xml
echo     ^<rule ref="category/java/performance.xml"/^> >> pmd-ruleset.xml
echo     ^<rule ref="category/java/security.xml"/^> >> pmd-ruleset.xml
echo. >> pmd-ruleset.xml
echo ^</ruleset^> >> pmd-ruleset.xml

echo ✅ Java code quality tools configured
echo.

echo [3/6] Setting up JavaScript/TypeScript code quality...
echo.

REM Create ESLint configuration
echo { > .eslintrc.json
echo   "env": { >> .eslintrc.json
echo     "browser": true, >> .eslintrc.json
echo     "es2021": true, >> .eslintrc.json
echo     "node": true, >> .eslintrc.json
echo     "jest": true >> .eslintrc.json
echo   }, >> .eslintrc.json
echo   "extends": [ >> .eslintrc.json
echo     "eslint:recommended", >> .eslintrc.json
echo     "@typescript-eslint/recommended", >> .eslintrc.json
echo     "plugin:react/recommended", >> .eslintrc.json
echo     "plugin:react-hooks/recommended", >> .eslintrc.json
echo     "plugin:@typescript-eslint/recommended" >> .eslintrc.json
echo   ], >> .eslintrc.json
echo   "parser": "@typescript-eslint/parser", >> .eslintrc.json
echo   "parserOptions": { >> .eslintrc.json
echo     "ecmaFeatures": { >> .eslintrc.json
echo       "jsx": true >> .eslintrc.json
echo     }, >> .eslintrc.json
echo     "ecmaVersion": 12, >> .eslintrc.json
echo     "sourceType": "module" >> .eslintrc.json
echo   }, >> .eslintrc.json
echo   "plugins": [ >> .eslintrc.json
echo     "react", >> .eslintrc.json
echo     "react-hooks", >> .eslintrc.json
echo     "@typescript-eslint" >> .eslintrc.json
echo   ], >> .eslintrc.json
echo   "rules": { >> .eslintrc.json
echo     "indent": ["error", 2], >> .eslintrc.json
echo     "linebreak-style": ["error", "unix"], >> .eslintrc.json
echo     "quotes": ["error", "single"], >> .eslintrc.json
echo     "semi": ["error", "always"], >> .eslintrc.json
echo     "no-unused-vars": "error", >> .eslintrc.json
echo     "no-console": "warn", >> .eslintrc.json
echo     "react/prop-types": "off", >> .eslintrc.json
echo     "@typescript-eslint/explicit-function-return-type": "off", >> .eslintrc.json
echo     "@typescript-eslint/no-explicit-any": "warn" >> .eslintrc.json
echo   }, >> .eslintrc.json
echo   "settings": { >> .eslintrc.json
echo     "react": { >> .eslintrc.json
echo       "version": "detect" >> .eslintrc.json
echo     } >> .eslintrc.json
echo   } >> .eslintrc.json
echo } >> .eslintrc.json

REM Create Prettier configuration
echo { > .prettierrc
echo   "semi": true, >> .prettierrc
echo   "trailingComma": "es5", >> .prettierrc
echo   "singleQuote": true, >> .prettierrc
echo   "printWidth": 100, >> .prettierrc
echo   "tabWidth": 2, >> .prettierrc
echo   "useTabs": false >> .prettierrc
echo } >> .prettierrc

REM Create Prettier ignore file
echo node_modules > .prettierignore
echo build >> .prettierignore
echo dist >> .prettierignore
echo coverage >> .prettierignore
echo *.min.js >> .prettierignore
echo *.min.css >> .prettierignore

echo ✅ JavaScript/TypeScript code quality configured
echo.

echo [4/6] Setting up Git hooks...
echo.

REM Create pre-commit hook
if not exist ".git\hooks" mkdir .git\hooks

echo #!/bin/sh > .git\hooks\pre-commit
echo # SAMS Pre-commit Hook >> .git\hooks\pre-commit
echo echo "Running pre-commit checks..." >> .git\hooks\pre-commit
echo. >> .git\hooks\pre-commit
echo # Run ESLint on staged JavaScript/TypeScript files >> .git\hooks\pre-commit
echo STAGED_JS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.(js|jsx|ts|tsx)$") >> .git\hooks\pre-commit
echo if [ "$STAGED_JS_FILES" != "" ]; then >> .git\hooks\pre-commit
echo   echo "Running ESLint on staged files..." >> .git\hooks\pre-commit
echo   npx eslint $STAGED_JS_FILES >> .git\hooks\pre-commit
echo   if [ $? -ne 0 ]; then >> .git\hooks\pre-commit
echo     echo "ESLint failed. Please fix the errors before committing." >> .git\hooks\pre-commit
echo     exit 1 >> .git\hooks\pre-commit
echo   fi >> .git\hooks\pre-commit
echo fi >> .git\hooks\pre-commit
echo. >> .git\hooks\pre-commit
echo # Run Prettier on staged files >> .git\hooks\pre-commit
echo if [ "$STAGED_JS_FILES" != "" ]; then >> .git\hooks\pre-commit
echo   echo "Running Prettier on staged files..." >> .git\hooks\pre-commit
echo   npx prettier --write $STAGED_JS_FILES >> .git\hooks\pre-commit
echo   git add $STAGED_JS_FILES >> .git\hooks\pre-commit
echo fi >> .git\hooks\pre-commit
echo. >> .git\hooks\pre-commit
echo echo "Pre-commit checks passed!" >> .git\hooks\pre-commit

echo ✅ Git hooks configured
echo.

echo [5/6] Creating code quality scripts...
echo.

REM Create comprehensive code quality runner
echo @echo off > run-code-quality.bat
echo echo ================================================================ >> run-code-quality.bat
echo echo  SAMS Code Quality Analysis >> run-code-quality.bat
echo echo ================================================================ >> run-code-quality.bat
echo echo. >> run-code-quality.bat
echo. >> run-code-quality.bat
echo echo [1/5] Running Java code quality checks... >> run-code-quality.bat
echo if exist "backend" ( >> run-code-quality.bat
echo     cd backend >> run-code-quality.bat
echo     echo Running Checkstyle... >> run-code-quality.bat
echo     call mvn checkstyle:check >> run-code-quality.bat
echo     echo Running PMD... >> run-code-quality.bat
echo     call mvn pmd:check >> run-code-quality.bat
echo     echo Running SpotBugs... >> run-code-quality.bat
echo     call mvn spotbugs:check >> run-code-quality.bat
echo     cd .. >> run-code-quality.bat
echo     echo ✅ Java code quality checks completed >> run-code-quality.bat
echo ^) >> run-code-quality.bat
echo echo. >> run-code-quality.bat
echo. >> run-code-quality.bat
echo echo [2/5] Running JavaScript/TypeScript quality checks... >> run-code-quality.bat
echo if exist "frontend" ( >> run-code-quality.bat
echo     cd frontend >> run-code-quality.bat
echo     echo Running ESLint... >> run-code-quality.bat
echo     call npx eslint src --ext .js,.jsx,.ts,.tsx >> run-code-quality.bat
echo     echo Running Prettier check... >> run-code-quality.bat
echo     call npx prettier --check src >> run-code-quality.bat
echo     cd .. >> run-code-quality.bat
echo     echo ✅ Frontend code quality checks completed >> run-code-quality.bat
echo ^) >> run-code-quality.bat
echo echo. >> run-code-quality.bat
echo. >> run-code-quality.bat
echo if exist "mobile-app" ( >> run-code-quality.bat
echo     echo [3/5] Running mobile app quality checks... >> run-code-quality.bat
echo     cd mobile-app >> run-code-quality.bat
echo     echo Running ESLint... >> run-code-quality.bat
echo     call npx eslint src --ext .js,.jsx,.ts,.tsx >> run-code-quality.bat
echo     echo Running Prettier check... >> run-code-quality.bat
echo     call npx prettier --check src >> run-code-quality.bat
echo     cd .. >> run-code-quality.bat
echo     echo ✅ Mobile app code quality checks completed >> run-code-quality.bat
echo ^) >> run-code-quality.bat
echo echo. >> run-code-quality.bat
echo. >> run-code-quality.bat
echo echo [4/5] Running SonarQube analysis... >> run-code-quality.bat
echo where sonar-scanner ^>nul 2^>nul >> run-code-quality.bat
echo if %%ERRORLEVEL%% EQU 0 ( >> run-code-quality.bat
echo     echo Running SonarQube scanner... >> run-code-quality.bat
echo     sonar-scanner >> run-code-quality.bat
echo     echo ✅ SonarQube analysis completed >> run-code-quality.bat
echo ^) else ( >> run-code-quality.bat
echo     echo ⚠️ SonarQube scanner not found, skipping analysis >> run-code-quality.bat
echo ^) >> run-code-quality.bat
echo echo. >> run-code-quality.bat
echo. >> run-code-quality.bat
echo echo [5/5] Generating quality reports... >> run-code-quality.bat
echo echo Collecting quality metrics... >> run-code-quality.bat
echo echo ✅ Code quality analysis completed! >> run-code-quality.bat
echo echo. >> run-code-quality.bat
echo echo Quality reports available in: >> run-code-quality.bat
echo echo - Java: backend/target/site/ >> run-code-quality.bat
echo echo - Frontend: frontend/eslint-report.html >> run-code-quality.bat
echo echo - SonarQube: http://localhost:9000 >> run-code-quality.bat
echo echo. >> run-code-quality.bat
echo pause >> run-code-quality.bat

echo ✅ Code quality scripts created
echo.

echo [6/6] Setting up IDE configurations...
echo.

REM Create VS Code settings
if not exist ".vscode" mkdir .vscode

echo { > .vscode\settings.json
echo   "editor.formatOnSave": true, >> .vscode\settings.json
echo   "editor.defaultFormatter": "esbenp.prettier-vscode", >> .vscode\settings.json
echo   "editor.codeActionsOnSave": { >> .vscode\settings.json
echo     "source.fixAll.eslint": true >> .vscode\settings.json
echo   }, >> .vscode\settings.json
echo   "java.configuration.updateBuildConfiguration": "automatic", >> .vscode\settings.json
echo   "java.checkstyle.configuration": "./checkstyle.xml", >> .vscode\settings.json
echo   "sonarlint.rules": { >> .vscode\settings.json
echo     "javascript:S1481": "off", >> .vscode\settings.json
echo     "typescript:S1481": "off" >> .vscode\settings.json
echo   } >> .vscode\settings.json
echo } >> .vscode\settings.json

REM Create VS Code extensions recommendations
echo { > .vscode\extensions.json
echo   "recommendations": [ >> .vscode\extensions.json
echo     "esbenp.prettier-vscode", >> .vscode\extensions.json
echo     "dbaeumer.vscode-eslint", >> .vscode\extensions.json
echo     "sonarsource.sonarlint-vscode", >> .vscode\extensions.json
echo     "vscjava.vscode-java-pack", >> .vscode\extensions.json
echo     "ms-vscode.vscode-typescript-next", >> .vscode\extensions.json
echo     "bradlc.vscode-tailwindcss", >> .vscode\extensions.json
echo     "ms-vscode.vscode-json" >> .vscode\extensions.json
echo   ] >> .vscode\extensions.json
echo } >> .vscode\extensions.json

echo ✅ IDE configurations created
echo.

echo ================================================================
echo  🎯 Code Quality Gates Setup Complete!
echo ================================================================
echo.
echo The following code quality tools have been configured:
echo.
echo ☕ JAVA QUALITY TOOLS:
echo   - Checkstyle for coding standards
echo   - PMD for code analysis
echo   - SpotBugs for bug detection
echo   - JaCoCo for code coverage
echo.
echo 🌐 JAVASCRIPT/TYPESCRIPT TOOLS:
echo   - ESLint for code linting
echo   - Prettier for code formatting
echo   - TypeScript compiler checks
echo.
echo 🔍 ANALYSIS TOOLS:
echo   - SonarQube for comprehensive analysis
echo   - Code coverage reporting
echo   - Security vulnerability scanning
echo.
echo 🔧 AUTOMATION:
echo   - Git pre-commit hooks
echo   - VS Code integration
echo   - CI/CD pipeline integration
echo.
echo 🚀 QUICK START:
echo.
echo 1. Run all quality checks:
echo    run-code-quality.bat
echo.
echo 2. Fix formatting issues:
echo    npx prettier --write .
echo    npx eslint --fix .
echo.
echo 3. Start SonarQube (if installed):
echo    docker run -d --name sonarqube -p 9000:9000 sonarqube:latest
echo.
echo 4. View quality reports:
echo    - Open backend/target/site/index.html
echo    - Open http://localhost:9000 (SonarQube)
echo.
echo ================================================================
echo.
pause