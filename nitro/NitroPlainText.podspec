require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroPlainText"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/mdjastrzebski/react-native-plain-text"
  s.license      = "MIT"
  s.authors      = "Maciej Jastrzębski"

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/mdjastrzebski/react-native-plain-text.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{swift,h,m,mm}"

  load "nitrogen/generated/ios/NitroPlainText+autolinking.rb"
  add_nitrogen_files(s)

  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  install_modules_dependencies(s)
end
