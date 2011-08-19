<!doctype html>
<html class="no-js no-treesaver">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,height=device-height,initial-scale=1,minimum-scale=1,maximum-scale=1">
    <title>Treesaver - Server Side generated articles</title>
    <link rel="resources" href="resources.html">
    <link rel="index" href="toc.php" type="application/json">
    <link rel="stylesheet" href="../treesaver.css">
    <script src="../../lib/handlebars/handlebars.js"></script>
    <script src="../../lib/closure/goog/base.js"></script>
    <script src="../../test/deps.js"></script>
    <script>
      goog.require('treesaver');
    </script>
  </head>
  <body>
    <article>
<?PHP
  if (!$_GET['article']) {
?>
      <h1>Table Of Contents</h1>
      <ul>
        <li><a href="?article=1">Article One</a></li>
        <li><a href="?article=2">Article Two</a></li>
      </ul>
<?
  } else if ($_GET['article'] == '1') {
?>
      <h1>Article One</h1>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam eget nisl odio, sit amet lobortis elit. Sed velit nunc, commodo eu interdum vitae, placerat id enim. Nam congue dapibus eleifend. Sed suscipit, nisi ac imperdiet commodo, nisl nibh dapibus purus, nec facilisis augue tellus vel mi. Aliquam erat volutpat. Phasellus volutpat, augue sit amet lacinia elementum, lacus urna egestas mauris, sit amet elementum metus lorem ut turpis. Curabitur laoreet commodo urna nec cursus. Cras sed justo et libero tristique mollis et at mi. Proin in nulla libero, id tempus sem. Nunc magna neque, ullamcorper sed mattis eget, feugiat sit amet risus.</p>

      <p>Quisque magna est, eleifend et suscipit et, volutpat consequat orci. In velit ligula, interdum eu fringilla vel, malesuada sed nibh. Donec ipsum nisi, pretium in lobortis faucibus, ullamcorper a nibh. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed pellentesque tempor risus id aliquet. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Curabitur vehicula felis quis dolor iaculis nec molestie libero consectetur. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam vitae nisl nulla, quis bibendum justo. Vestibulum varius risus vitae enim interdum id congue mauris hendrerit. Quisque porttitor viverra gravida. Praesent luctus, arcu ac ullamcorper pulvinar, sapien sapien laoreet nunc, nec dictum dolor nunc eget eros.</p>

      <p>Mauris luctus metus et tellus rhoncus vehicula. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Phasellus a suscipit erat. Cras viverra dui porttitor nulla cursus in accumsan dui aliquam. Fusce eget dui sed nunc sodales suscipit id sed turpis. Nullam vulputate scelerisque nisi, non consequat est dapibus at. Nulla ullamcorper arcu non sapien consectetur sit amet gravida orci varius. Pellentesque consectetur ante at magna sollicitudin convallis. Pellentesque a sapien neque. Aenean ultrices, libero ac gravida consectetur, turpis massa laoreet mauris, id ornare massa ligula ut libero. Nulla orci arcu, pulvinar eget bibendum eu, tincidunt at orci. Quisque a eros nec metus ultricies mollis. Quisque posuere aliquet justo eget feugiat. Aenean imperdiet aliquam ultrices. Maecenas fringilla dignissim erat, fringilla sodales felis porttitor eget. Nam tempor ullamcorper orci, mattis tristique est tincidunt in.</p>
<?
  } else if ($_GET['article'] == '2') {
?>
      <h1>Article Two</h1>
      <p>Aliquam id magna eros. Curabitur mauris elit, scelerisque et placerat vel, imperdiet at purus. In mi erat, fermentum nec hendrerit et, pharetra eu eros. Aliquam eget convallis neque. Etiam ornare eleifend tellus, at lobortis est tristique et. Quisque nisl quam, semper vel tincidunt sit amet, luctus sit amet purus. In hac habitasse platea dictumst. Curabitur quis placerat mi. Phasellus tempor malesuada lorem ac mattis. Etiam tempus velit in justo accumsan commodo. Suspendisse vitae iaculis dui. Curabitur ligula neque, aliquet eu consectetur sit amet, elementum ut leo. Aliquam dui nisi, sollicitudin non aliquet eget, posuere volutpat velit. Phasellus tempus dignissim laoreet. Suspendisse potenti. Ut non purus sit amet odio rutrum rutrum. Morbi ut leo erat.</p>

      <p>Mauris porttitor hendrerit neque ut egestas. Nam tincidunt euismod nibh, sit amet posuere felis congue vehicula. Nam at magna id orci tempus mattis. Cras a iaculis enim. Pellentesque posuere placerat libero quis venenatis. Nunc id sem ipsum. Vivamus urna massa, vulputate sit amet molestie quis, placerat ac mauris. Donec sed tellus metus. Integer cursus, tortor nec lobortis porttitor, metus tellus ornare turpis, ut tristique nisi ipsum sit amet lectus. Sed placerat leo at augue fermentum auctor. Suspendisse ac nisl lobortis sapien rhoncus mollis eu dapibus justo. Integer venenatis faucibus nunc, sed tempor sapien laoreet quis. Donec risus nisl, laoreet quis facilisis ut, gravida sit amet neque. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec eget lacus tellus.</p>
    </article>
<?
  }
?>
    </article>
  </body>
</html>
