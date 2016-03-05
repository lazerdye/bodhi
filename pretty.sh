
for filename in insight.js address_view.js block_view.js bodhi.js ; do

  echo $filename
  ./node_modules/.bin/js-beautify -r $filename -s 2 -a -n
  ./node_modules/.bin/standard $filename

done

